/**
 * Thin HTTP client for Bendo `app/api` from the Doro harness overlay.
 * Auth uses a Clerk session JWT:
 *   1) per-request `runWithBendoClerkToken` (chat bridge)
 *   2) `BENDO_API_TOKEN` env
 *   3) plugin config `token`
 */

import { AsyncLocalStorage } from 'node:async_hooks'

import type { JsonValue } from '@deepseek-ai/dsh-util-values'

export type BendoApiConfig = {
  /** Origin of the Next.js app, no trailing slash. */
  baseUrl: string
  /** Fallback Clerk JWT when no per-request / env token is set. */
  token: string
}

type BendoRequestStore = {
  readonly clerkToken?: string
}

const bendoRequestStore = new AsyncLocalStorage<BendoRequestStore>()

/** Run `fn` with a per-request Clerk JWT visible to `bendoFetch` / `activeBendoToken`. */
export function runWithBendoClerkToken<T>(
  clerkToken: string,
  fn: () => Promise<T>,
): Promise<T> {
  return bendoRequestStore.run({ clerkToken }, fn)
}

/** Resolve the JWT for the current async context. */
export function activeBendoToken(config: BendoApiConfig): string {
  return (
    bendoRequestStore.getStore()?.clerkToken?.trim()
    || process.env.BENDO_API_TOKEN?.trim()
    || config.token.trim()
    || ''
  )
}

export function resolveBendoApiConfig(options: {
  baseUrl?: string
  token?: string
}): BendoApiConfig {
  const baseUrl = (
    process.env.BENDO_API_BASE_URL?.trim()
    || options.baseUrl?.trim()
    || 'http://localhost:3000'
  ).replace(/\/$/u, '')

  const token = process.env.BENDO_API_TOKEN?.trim() || options.token?.trim() || ''

  return { baseUrl, token }
}

type BendoFetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: JsonValue
  signal?: AbortSignal
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return true
  if (Array.isArray(value)) return value.every(isJsonValue)
  if (t === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJsonValue)
  }
  return false
}

/**
 * Call a Bendo API path and return the parsed JSON body (`{ data }` or `{ error }`).
 * @throws on network failure, non-OK status, or missing auth token when required.
 */
export async function bendoFetch(
  config: BendoApiConfig,
  path: string,
  options: BendoFetchOptions = {},
): Promise<JsonValue> {
  const token = activeBendoToken(config)
  if (!token) {
    throw new Error(
      'Bendo API auth missing. Set BENDO_API_TOKEN (Clerk session JWT), pass clerkToken via chat bridge, or doro-tools config.token.',
    )
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }

  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers,
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(options.body)
  }
  if (options.signal !== undefined) {
    init.signal = options.signal
  }

  const response = await fetch(`${config.baseUrl}${path}`, init)

  let payload: JsonValue = null
  const text = await response.text()
  if (text) {
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new Error(
        `Bendo API ${options.method ?? 'GET'} ${path} returned non-JSON (${response.status}): ${text.slice(0, 200)}`,
      )
    }
    if (!isJsonValue(parsed)) {
      throw new Error(`Bendo API ${options.method ?? 'GET'} ${path} returned non-JSON-value payload.`)
    }
    payload = parsed
  }

  if (!response.ok) {
    const errorBody = payload !== null && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as { error?: string; code?: string }
      : null
    const message = errorBody?.error
      ?? `Bendo API ${options.method ?? 'GET'} ${path} failed (${response.status})`
    const code = errorBody?.code ? ` [${errorBody.code}]` : ''
    throw new Error(`${message}${code}`)
  }

  return payload
}

/** Pretty-print a tool result for the model transcript. */
export function renderJson(_args: unknown, value: JsonValue) {
  return [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }]
}
