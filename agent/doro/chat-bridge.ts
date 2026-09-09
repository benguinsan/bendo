/**
 * Trusted HTTP ingress for bendo-app → Doro turns.
 *
 * POST {path} with JSON `{ message, sessionId?, clerkToken? }`
 * Header `x-bendo-chat-secret` must match config/env secret.
 * Response `{ sessionId, replyText }`.
 *
 * Pattern references:
 * - route registration: packages/webhook/webhook-github
 * - agent create / whenIdle / summarize: packages/bundle/headless
 */
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Context } from '@deepseek-ai/cordis'
import { brandString } from '@deepseek-ai/dsh-brand'
import {
  installModelSelection,
  type Agent,
  type AgentHandle,
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

type ChatBridgeBody = {
  message?: unknown
  sessionId?: unknown
  clerkToken?: unknown
}

type LiveEntry = {
  handle: AgentHandle
  queue: Promise<unknown>
}

const liveBySession = new Map<string, LiveEntry>()

function assertPath(path: string): void {
  if (!path.startsWith('/') || path === '/' || path.endsWith('/')
    || path.includes('?') || path.includes('#')) {
    throw new Error(
      'bendo-chat-bridge path must be an absolute non-root pathname without a trailing slash, query, or fragment',
    )
  }
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

function installDefaultModel(ctx: Context, agentCtx: Context): void {
  const defaultModel = ctx.agentDefaultModel
  const selection = defaultModel.currentSelection()
  const selected: ModelSelectionRef = { current: selection, assembled: undefined }
  installModelSelection(agentCtx, selected)
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
          installDefaultModel(ctx, agentCtx)
        },
      })
      const entry: LiveEntry = { handle, queue: Promise.resolve() }
      liveBySession.set(sessionId, entry)
      return { sessionId, agent: handle.agent, entry }
    } catch {
      // Fall through to create a fresh session when resume is unavailable.
    }
  }

  const nextId = `bendo-${randomUUID()}`
  const handle = await ctx.agents.create({
    sessionId: brandString<SessionId>(nextId),
    meta: { cwd: process.cwd() },
    agentOptions: (() => {
      const selection = ctx.agentDefaultModel.currentSelection()
      return { provider: selection.provider, model: selection.model }
    })(),
    setup: (agentCtx) => {
      installDefaultModel(ctx, agentCtx)
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
    throw Object.assign(
      new Error(`${err.code}: ${err.message}`),
      { status: 502 },
    )
  }
  return { replyText: outcome.text }
}

export function apply(ctx: Context, config: Config): void {
  assertPath(config.path)

  const handler = async (request: IncomingMessage, response: ServerResponse) => {
    try {
      if (request.method !== 'POST') {
        response.setHeader('allow', 'POST')
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
      if (header !== secret) {
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

      const message = typeof parsed.message === 'string' ? parsed.message.trim() : ''
      if (!message) {
        jsonResponse(response, 400, { error: 'message is required' })
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
