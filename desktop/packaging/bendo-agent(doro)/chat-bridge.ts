/**
 * Trusted HTTP ingress for bendo-app → Doro turns.
 *
 * GET  {path} → `{ ok: true }` (liveness; no secret)
 * POST {path} with JSON:
 *   - Chat: `{ message, sessionId?, clerkToken? }` (requires prior applyModelConfig)
 *   - Apply model config: `{ action: "applyModelConfig", provider, endpoint, apiKey, model }`
 *     Maps Bendo provider → llm-pi-ai route via {@link BENDO_PROVIDER_ROUTE},
 *     writes `llm-pi-ai.providers.<route>` (credentials + selection).
 * Header `x-bendo-chat-secret` must match config/env secret.
 * Chat response `{ sessionId, replyText }`. Apply response `{ ok: true }`.
 * Chat without an applied user model config returns 200 with a Doro-voice
 * `replyText` (no agent turn, no cordis default fallback) — not a hard 400.
 *
 * Pattern references:
 * - route registration: packages/webhook/webhook-github
 * - agent create / whenIdle / summarize: packages/bundle/headless
 */
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Context } from '@deepseek-ai/cordis'
import { brandString } from '@deepseek-ai/dsh-brand'
import {
  installModelSelection,
  type Agent,
  type AgentHandle,
  type ModelSelection,
  type ModelSelectionRef,
} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionSeq } from '@deepseek-ai/dsh-session'
import type {
  Session,
  SessionEvent,
  SessionId,
  SessionLogOffset,
} from '@deepseek-ai/dsh-session'
import z from '@deepseek-ai/schemastery'

import { runWithBendoClerkToken } from './bendo-api.ts'

export const name = 'bendo-chat-bridge'

export const inject = ['webServer', 'agentDefaultModel', 'agents', 'sessions']

export interface Config {
  /** Exact absolute pathname, e.g. `/bendo-chat`. */
  path: string
  /**
   * Shared secret for `x-bendo-chat-secret`.
   * Overridden by `DSH_CHAT_BRIDGE_SECRET` or `DSH_BENDO_CHAT_SECRET` when set.
   */
  secret: string
  /** Max wait for one agent turn (ms). */
  timeoutMs: number
  /** Max UTF-8 body bytes. */
  maxBodyBytes: number
}

export const Config: z<Config> = z.object({
  path: z.string().required(),
  secret: z.string().default(''),
  timeoutMs: z.number().step(1).min(1_000).max(600_000).default(120_000),
  maxBodyBytes: z.number().step(1).min(1).max(20_000_000).default(1_000_000),
})

type BendoModelProvider = 'openrouter' | 'vilao' | 'gpt' | 'gemini'

type ChatBridgeBody = {
  action?: unknown
  message?: unknown
  sessionId?: unknown
  clerkToken?: unknown
  provider?: unknown
  endpoint?: unknown
  apiKey?: unknown
  model?: unknown
}

type AppliedModelConfig = {
  bendoProvider: BendoModelProvider
  /** dsh / llm-pi-ai provider route id. */
  dshProvider: string
  endpoint: string
  apiKey: string
  model: string
  apiKeyEnv: string
}

type LiveEntry = {
  handle: AgentHandle
  queue: Promise<unknown>
}

const liveBySession = new Map<string, LiveEntry>()

/**
 * In-process applied user model config (cleared on harness restart until
 * durable userData persist ships).
 */
let appliedModelConfig: AppliedModelConfig | null = null

/** Soft chat reply when Save/apply has not run yet (shown as a Doro bubble). */
const MISSING_MODEL_CONFIG_REPLY =
  'Cậu chưa cấu hình model cho Doro rồi. Mở nút cấu hình model trên Agent, điền rồi Save nhé — kể cả khi status đang Ready to chat, Save lại giúp mình.'

/** Soft Doro replies for provider/model turn failures (not hard JSON errors). */
const SOFT_REPLY_INVALID_KEY =
  'API key hình như chưa đúng hoặc hết hạn rồi. Cậu mở chìa khóa, dán key mới rồi Save lại giúp mình nhé.'
const SOFT_REPLY_NO_CREDIT =
  'Tài khoản model hết credit hoặc chưa thanh toán rồi. Cậu kiểm tra bên provider, nạp thêm rồi Save lại key giúp mình nhé.'
const SOFT_REPLY_MODEL_MISSING =
  'Model id hình như không tồn tại hoặc không dùng được với key này. Cậu mở Advanced, sửa tên model (hoặc để mặc định) rồi Save lại nhé.'
const SOFT_REPLY_RATE_LIMIT =
  'Provider đang giới hạn tốc độ rồi. Cậu đợi một chút rồi gửi lại, hoặc thử sau nhé.'
const SOFT_REPLY_PROVIDER =
  'Provider model đang lỗi hoặc từ chối request. Cậu thử lại sau, hoặc mở chìa khóa kiểm tra key / Advanced rồi Save lại nhé.'

function softReplyForAgentTurnError(detail: string): string | null {
  const lower = detail.toLowerCase()
  // Provider key only — avoid bare "unauthorized" (app session auth).
  if (
    /invalid.?api.?key|incorrect api key|api key.*(invalid|expired|incorrect|revoked)/.test(
      lower,
    )
  ) {
    return SOFT_REPLY_INVALID_KEY
  }
  if (/credit|quota|billing|insufficient|payment|402\b|out of credit/.test(lower)) {
    return SOFT_REPLY_NO_CREDIT
  }
  if (
    /model_not_found|model not found|does not exist|invalid model|no such model|\b404\b/.test(
      lower,
    )
  ) {
    return SOFT_REPLY_MODEL_MISSING
  }
  if (/rate.?limit|too many requests|\b429\b/.test(lower)) {
    return SOFT_REPLY_RATE_LIMIT
  }
  if (
    /provider|openai|openrouter|gemini|vilao|llm|completion|\b502\b|\b503\b/.test(
      lower,
    )
  ) {
    return SOFT_REPLY_PROVIDER
  }
  return null
}

/**
 * How Bendo maps onto an llm-pi-ai provider route.
 *
 * - `catalog` — pi-ai ships the route (`openrouter`, `openai`, `google`).
 *   Apply still pins `models` (agent needs the selected id) and may set
 *   `openai-completions` so non-catalog model ids stay serviceable.
 * - `hand-declare` — route is absent from the catalog (`vilao`). Must set
 *   `api` + `baseURL` + `models` (same shape as the Models page create card).
 */
type BendoProviderRouteKind = 'catalog' | 'hand-declare'

type BendoProviderRoute = {
  /** llm-pi-ai / agent-default-model provider id. */
  dshProvider: string
  apiKeyEnv: string
  kind: BendoProviderRouteKind
  /**
   * Wire protocol written on the profile.
   * Required for hand-declare. For OpenAI-compatible catalog routes, set so a
   * pinned `models` list with custom ids does not fail assertServiceable.
   * Omitted for `gemini` → `google` so catalog models keep the native Google API.
   */
  api?: 'openai-completions'
}

/**
 * Bendo UI provider → llm-pi-ai route profile (single source of truth for A2).
 *
 * | Bendo     | dsh route   | kind          | api                 |
 * |-----------|-------------|---------------|---------------------|
 * | openrouter| openrouter  | catalog       | openai-completions  |
 * | gpt       | openai      | catalog       | openai-completions  |
 * | gemini    | google      | catalog       | (omit / native)     |
 * | vilao     | vilao       | hand-declare  | openai-completions  |
 */
const BENDO_PROVIDER_ROUTE: Record<BendoModelProvider, BendoProviderRoute> = {
  openrouter: {
    dshProvider: 'openrouter',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    kind: 'catalog',
    api: 'openai-completions',
  },
  gpt: {
    dshProvider: 'openai',
    apiKeyEnv: 'OPENAI_API_KEY',
    kind: 'catalog',
    api: 'openai-completions',
  },
  gemini: {
    dshProvider: 'google',
    apiKeyEnv: 'GEMINI_API_KEY',
    kind: 'catalog',
  },
  vilao: {
    dshProvider: 'vilao',
    apiKeyEnv: 'VILAO_API_KEY',
    kind: 'hand-declare',
    api: 'openai-completions',
  },
}

function assertPath(path: string): void {
  if (!path.startsWith('/') || path === '/' || path.endsWith('/')
    || path.includes('?') || path.includes('#')) {
    throw new Error(
      'bendo-chat-bridge path must be an absolute non-root pathname without a trailing slash, query, or fragment',
    )
  }
}

/**
 * Constant-time secret check. Hash both sides first so the buffers always have
 * equal length (`timingSafeEqual` throws on a length mismatch, which would leak it).
 */
function secretMatches(provided: string | undefined, secret: string): boolean {
  if (typeof provided !== 'string') return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(provided), digest(secret))
}

function resolveSecret(configSecret: string): string {
  return (
    process.env.DSH_CHAT_BRIDGE_SECRET?.trim()
    || process.env.DSH_BENDO_CHAT_SECRET?.trim()
    || configSecret.trim()
  )
}

function jsonResponse(
  response: ServerResponse,
  status: number,
  payload: Record<string, unknown>,
): void {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(body)
}

async function readUtf8Body(
  request: IncomingMessage,
  maxBodyBytes: number,
): Promise<string> {
  const declared = request.headers['content-length']
  if (declared !== undefined) {
    if (!/^(0|[1-9]\d*)$/.test(declared)) {
      throw Object.assign(new Error('invalid Content-Length'), { status: 400 })
    }
    const length = Number(declared)
    if (!Number.isSafeInteger(length) || length > maxBodyBytes) {
      request.resume()
      throw Object.assign(new Error('request body is too large'), { status: 413 })
    }
  }

  const chunks: Buffer[] = []
  let size = 0
  try {
    for await (const raw of request) {
      const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as string)
      size += chunk.byteLength
      if (size > maxBodyBytes) {
        request.resume()
        throw Object.assign(new Error('request body is too large'), { status: 413 })
      }
      chunks.push(chunk)
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) throw error
    throw Object.assign(new Error('request body was aborted'), { status: 400 })
  }
  if (!request.complete) {
    throw Object.assign(new Error('request body was aborted'), { status: 400 })
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size))
  } catch {
    throw Object.assign(new Error('request body is not valid UTF-8'), { status: 400 })
  }
}

function summarize(session: Session, firstSeq: SessionLogOffset): {
  text: string
  reason: SessionEvent<'turn/end'>['data']['reason'] | undefined
} {
  let started = false
  let text = ''
  let reason: SessionEvent<'turn/end'>['data']['reason'] | undefined
  const length = session.seq
  for (let seq = firstSeq; seq < length; seq++) {
    const event = session.eventAt(SessionSeq(seq))
    if (event === undefined) {
      throw new Error(`chat-bridge summary cannot read seq ${String(seq)}`)
    }
    if (event.type === 'turn/start') {
      started = true
      continue
    }
    if (!started) continue
    if (event.type === 'assistant/message') {
      const joined = event.data.message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
      if (joined !== '') text = joined
    }
    if (event.type === 'turn/end') reason = event.data.reason
  }
  return { text, reason }
}

async function waitIdle(agent: Agent, timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      agent.whenIdle(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(Object.assign(new Error(`agent turn timed out after ${timeoutMs}ms`), { status: 504 }))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

function isBendoModelProvider(value: string): value is BendoModelProvider {
  return value === 'openrouter'
    || value === 'vilao'
    || value === 'gpt'
    || value === 'gemini'
}

// Mirror of MODEL_API_PROVIDER_ALLOWED_HOSTS in bendo-app/lib/agent/model-api-key.ts
// (the overlay cannot import bendo-app). The bridge re-checks so a caller holding the
// bridge secret cannot bypass Next and point the agent at an arbitrary endpoint.
const BENDO_PROVIDER_ALLOWED_HOSTS: Record<BendoModelProvider, readonly string[]> = {
  openrouter: ['openrouter.ai'],
  vilao: ['api.vilao.ai'],
  gpt: ['api.openai.com'],
  gemini: ['generativelanguage.googleapis.com'],
}

function isAllowedModelEndpoint(provider: BendoModelProvider, endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:') return false
    if (url.username || url.password) return false
    if (url.port && url.port !== '443') return false
    return BENDO_PROVIDER_ALLOWED_HOSTS[provider].includes(url.hostname.toLowerCase())
  } catch {
    return false
  }
}

/**
 * Chat requires a user model config applied from Bendo first.
 * Do not fall back to cordis `agent-default-model` (no shipped provider key).
 */
function requireAppliedModelSelection(): ModelSelection {
  if (!appliedModelConfig) {
    throw Object.assign(
      new Error(
        'model config has not been applied; save model configuration in Bendo Agent before chatting',
      ),
      { status: 400 },
    )
  }
  return {
    provider: appliedModelConfig.dshProvider,
    model: appliedModelConfig.model,
  }
}

function installAppliedModel(agentCtx: Context): void {
  const selection = requireAppliedModelSelection()
  const selected: ModelSelectionRef = { current: selection, assembled: undefined }
  installModelSelection(agentCtx, selected)
}

type PiAiModelEntry = { id: string; name: string }

/**
 * Read models already declared on `llm-pi-ai.providers.<route>` so apply can
 * merge the selected id instead of wiping a shared Models-page list.
 */
function readExistingProviderModels(
  ctx: Context,
  dshProvider: string,
): PiAiModelEntry[] {
  const settings = ctx.get('settings') as {
    get?: (ns: string) => unknown
  } | undefined
  const section = settings?.get?.('llm-pi-ai')
  if (!section || typeof section !== 'object' || Array.isArray(section)) return []
  const providers = (section as { providers?: unknown }).providers
  if (!providers || typeof providers !== 'object' || Array.isArray(providers)) return []
  const profile = (providers as Record<string, unknown>)[dshProvider]
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return []
  const models = (profile as { models?: unknown }).models
  if (!Array.isArray(models)) return []

  const out: PiAiModelEntry[] = []
  for (const entry of models) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const idRaw = (entry as { id?: unknown }).id
    if (typeof idRaw !== 'string') continue
    const id = idRaw.trim()
    if (!id) continue
    const nameRaw = (entry as { name?: unknown }).name
    const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : id
    out.push({ id, name })
  }
  return out
}

/**
 * Build the llm-pi-ai provider profile from {@link BENDO_PROVIDER_ROUTE}.
 * Ensures the applied model id is present; keeps prior models on that route.
 */
function buildPiAiProviderProfile(
  route: BendoProviderRoute,
  endpoint: string,
  model: string,
  existingModels: readonly PiAiModelEntry[],
): Record<string, unknown> {
  const byId = new Map<string, PiAiModelEntry>()
  for (const entry of existingModels) {
    byId.set(entry.id, entry)
  }
  byId.set(model, { id: model, name: model })

  const models: PiAiModelEntry[] = [{ id: model, name: model }]
  for (const entry of byId.values()) {
    if (entry.id !== model) models.push(entry)
  }

  const profile: Record<string, unknown> = {
    displayName: 'Bendo',
    apiKeyEnv: route.apiKeyEnv,
    baseURL: endpoint,
    models,
  }
  if (route.api !== undefined) {
    profile.api = route.api
  } else if (route.kind === 'hand-declare') {
    // Table should always set api for hand-declare; keep a safe fallback.
    profile.api = 'openai-completions'
  }
  return profile
}

/**
 * Replace `llm-pi-ai.providers.<route>` via settings.mutate (wholesale set,
 * matching CustomProviderCard) so prior modelOverrides cannot coexist with
 * the models list and fail assertServiceable.
 */
async function writePiAiProviderSettings(
  ctx: Context,
  dshProvider: string,
  profile: Record<string, unknown>,
): Promise<void> {
  const settings = ctx.get('settings') as {
    mutate?: (
      ns: string,
      ops: readonly { op: 'set' | 'unset'; path: string[]; value?: unknown }[],
    ) => Promise<void>
  } | undefined
  if (!settings?.mutate) {
    throw Object.assign(
      new Error('settings service is not available; cannot apply model provider route'),
      { status: 503 },
    )
  }
  try {
    await settings.mutate('llm-pi-ai', [{
      op: 'set',
      path: ['providers', dshProvider],
      value: profile,
    }])
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw Object.assign(
      new Error(`failed to write llm-pi-ai provider settings: ${message}`),
      { status: 400 },
    )
  }
}

async function applyUserModelConfig(
  ctx: Context,
  parsed: ChatBridgeBody,
): Promise<void> {
  const providerRaw = typeof parsed.provider === 'string' ? parsed.provider.trim() : ''
  const endpoint = typeof parsed.endpoint === 'string' ? parsed.endpoint.trim() : ''
  const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : ''
  const model = typeof parsed.model === 'string' ? parsed.model.trim() : ''

  if (!isBendoModelProvider(providerRaw)) {
    throw Object.assign(new Error('provider must be openrouter, vilao, gpt, or gemini'), { status: 400 })
  }
  if (!endpoint) {
    throw Object.assign(new Error('endpoint is required'), { status: 400 })
  }
  if (!isAllowedModelEndpoint(providerRaw, endpoint)) {
    throw Object.assign(new Error('endpoint is not allowed for this provider'), { status: 400 })
  }
  if (!apiKey) {
    throw Object.assign(new Error('apiKey is required'), { status: 400 })
  }
  if (!model) {
    throw Object.assign(new Error('model is required'), { status: 400 })
  }

  const route = BENDO_PROVIDER_ROUTE[providerRaw]
  const existingModels = readExistingProviderModels(ctx, route.dshProvider)
  const providerProfile = buildPiAiProviderProfile(
    route,
    endpoint,
    model,
    existingModels,
  )

  // Prefer the credentials seam so llm-pi-ai resolves the key per request.
  // Avoid importing @deepseek-ai/dsh-credentials here — overlay rootDir cannot
  // pull that package's sources; brand the env ref the same way as SessionId.
  const credentials = ctx.get('credentials') as {
    set?: (ref: ReturnType<typeof brandString>, value: string) => Promise<void>
  } | undefined
  if (credentials?.set) {
    await credentials.set(brandString(route.apiKeyEnv), apiKey)
  } else {
    // Localhost MVP fallback when credentials provider is not mounted.
    process.env[route.apiKeyEnv] = apiKey
  }

  // Register the route in llm-pi-ai before selection/chat, or UNKNOWN_MODEL.
  await writePiAiProviderSettings(ctx, route.dshProvider, providerProfile)

  // Persist selection into settings when available; module state covers no-settings deploys.
  await ctx.agentDefaultModel.saveSelection({
    provider: route.dshProvider,
    model,
  })

  appliedModelConfig = {
    bendoProvider: providerRaw,
    dshProvider: route.dshProvider,
    endpoint,
    apiKey,
    model,
    apiKeyEnv: route.apiKeyEnv,
  }
}

async function obtainAgent(
  ctx: Context,
  sessionId: string | undefined,
): Promise<{ sessionId: string; agent: Agent; entry: LiveEntry }> {
  if (sessionId) {
    const existing = liveBySession.get(sessionId)
    if (existing) {
      return { sessionId, agent: existing.handle.agent, entry: existing }
    }

    const live = ctx.agents.get(brandString<SessionId>(sessionId))
    if (live) {
      // Live but not tracked here (e.g. created elsewhere) — wrap a no-op dispose holder.
      const handle: AgentHandle = {
        agent: live,
        dispose: async () => undefined,
      }
      const entry: LiveEntry = { handle, queue: Promise.resolve() }
      liveBySession.set(sessionId, entry)
      return { sessionId, agent: live, entry }
    }

    try {
      const handle = await ctx.agents.resume({
        resumeSessionId: brandString<SessionId>(sessionId),
        setup: (agentCtx) => {
          installAppliedModel(agentCtx)
        },
      })
      const entry: LiveEntry = { handle, queue: Promise.resolve() }
      liveBySession.set(sessionId, entry)
      return { sessionId, agent: handle.agent, entry }
    } catch (error: unknown) {
      // Re-throw apply/config gate errors; only soft-fail unavailable resume.
      if (error && typeof error === 'object' && 'status' in error) throw error
      // Fall through to create a fresh session when resume is unavailable.
    }
  }

  const nextId = `bendo-${randomUUID()}`
  const selection = requireAppliedModelSelection()
  const handle = await ctx.agents.create({
    sessionId: brandString<SessionId>(nextId),
    meta: { cwd: process.cwd() },
    agentOptions: {
      provider: selection.provider,
      model: selection.model,
    },
    setup: (agentCtx) => {
      installAppliedModel(agentCtx)
    },
  })
  const entry: LiveEntry = { handle, queue: Promise.resolve() }
  liveBySession.set(nextId, entry)
  return { sessionId: nextId, agent: handle.agent, entry }
}

async function runTurn(
  ctx: Context,
  agent: Agent,
  message: string,
  timeoutMs: number,
): Promise<{ replyText: string }> {
  await waitIdle(agent, timeoutMs)
  const firstSeq = agent.session.seq
  agent.followup(createUserMessage({
    content: [{ type: 'text', text: message }],
    source: { kind: 'user' },
  }))
  await waitIdle(agent, timeoutMs)
  await ctx.sessions.flush(agent.session)
  const outcome = summarize(agent.session, firstSeq)
  if (outcome.reason?.kind === 'error') {
    const err = outcome.reason.error
    const detail = `${err.code}: ${err.message}`
    const soft = softReplyForAgentTurnError(detail)
    if (soft) {
      return { replyText: soft }
    }
    throw Object.assign(new Error(detail), { status: 502 })
  }
  return { replyText: outcome.text }
}

export function apply(ctx: Context, config: Config): void {
  assertPath(config.path)

  const handler = async (request: IncomingMessage, response: ServerResponse) => {
    try {
      if (request.method === 'GET') {
        jsonResponse(response, 200, {
          ok: true,
          service: 'bendo-chat-bridge',
        })
        return
      }

      if (request.method !== 'POST') {
        response.setHeader('allow', 'GET, POST')
        jsonResponse(response, 405, { error: 'method not allowed' })
        return
      }

      const secret = resolveSecret(config.secret)
      if (!secret) {
        jsonResponse(response, 503, {
          error: 'chat bridge secret is not configured (set cordis secret or DSH_CHAT_BRIDGE_SECRET)',
        })
        return
      }

      const provided = request.headers['x-bendo-chat-secret']
      const header = Array.isArray(provided) ? provided[0] : provided
      if (!secretMatches(header, secret)) {
        jsonResponse(response, 401, { error: 'unauthorized' })
        return
      }

      const contentType = request.headers['content-type'] ?? ''
      if (!contentType.toLowerCase().includes('application/json')) {
        jsonResponse(response, 415, { error: 'content type must be application/json' })
        return
      }

      const raw = await readUtf8Body(request, config.maxBodyBytes)
      let parsed: ChatBridgeBody
      try {
        parsed = JSON.parse(raw) as ChatBridgeBody
      } catch {
        jsonResponse(response, 400, { error: 'request body is not valid JSON' })
        return
      }

      if (parsed.action === 'applyModelConfig') {
        const loader = ctx.get('loader') as { await?: () => Promise<unknown> } | undefined
        await loader?.await?.()

        const defaultModel = ctx.get('agentDefaultModel')
        if (defaultModel === undefined) {
          jsonResponse(response, 503, { error: 'agent services are not ready' })
          return
        }

        await applyUserModelConfig(ctx, parsed)
        jsonResponse(response, 200, { ok: true })
        return
      }

      const message = typeof parsed.message === 'string' ? parsed.message.trim() : ''
      if (!message) {
        jsonResponse(response, 400, { error: 'message is required' })
        return
      }

      // No Save/apply yet: answer in-chat as Doro (do not run an agent turn or
      // fall back to cordis agent-default-model — no shipped provider key).
      if (!appliedModelConfig) {
        const pendingSessionId = typeof parsed.sessionId === 'string' && parsed.sessionId.trim()
          ? parsed.sessionId.trim()
          : `bendo-pending-config-${randomUUID()}`
        jsonResponse(response, 200, {
          sessionId: pendingSessionId,
          replyText: MISSING_MODEL_CONFIG_REPLY,
        })
        return
      }

      const sessionId = typeof parsed.sessionId === 'string' && parsed.sessionId.trim()
        ? parsed.sessionId.trim()
        : undefined
      const clerkToken = typeof parsed.clerkToken === 'string' ? parsed.clerkToken : ''

      const loader = ctx.get('loader') as { await?: () => Promise<unknown> } | undefined
      await loader?.await?.()

      const agents = ctx.get('agents')
      const defaultModel = ctx.get('agentDefaultModel')
      const sessions = ctx.get('sessions')
      if (agents === undefined || defaultModel === undefined || sessions === undefined) {
        jsonResponse(response, 503, { error: 'agent services are not ready' })
        return
      }

      const obtained = await obtainAgent(ctx, sessionId)
      const turn = obtained.entry.queue.then(() =>
        runWithBendoClerkToken(clerkToken, () =>
          runTurn(ctx, obtained.agent, message, config.timeoutMs)))
      obtained.entry.queue = turn.then(() => undefined, () => undefined)

      const { replyText } = await turn
      jsonResponse(response, 200, {
        sessionId: obtained.sessionId,
        replyText,
      })
    } catch (error: unknown) {
      const status = error && typeof error === 'object' && 'status' in error
        && typeof (error as { status: unknown }).status === 'number'
        ? (error as { status: number }).status
        : 500
      const message = error instanceof Error ? error.message : String(error)
      jsonResponse(response, status, { error: message })
    }
  }

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: config.path,
      handler,
    }),
    `bendo-chat-bridge: ${config.path}`,
  )
}
