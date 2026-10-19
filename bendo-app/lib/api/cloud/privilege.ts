import "server-only";
import { resolveSessionTokenForCloud } from "@/lib/api/cloud/auth";
import { getCloudApiOrigin, isCloudSupabaseMode } from "@/lib/api/cloud/mode";
import { unauthorized } from "@/lib/api/respond";

const PRIVILEGED_API_PREFIXES = [
  "/api/me",
  "/api/tasks",
  "/api/categories",
  "/api/notifications",
  "/api/discord-identity",
] as const;

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

// Drop encoding/length: undici `fetch` decompresses the body, but Vercel may
// still send Content-Encoding. Forwarding that → browser ERR_CONTENT_DECODING_FAILED.
const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
]);

/** True when pathname is an allowlisted privileged API (or a nested path). */
function isAllowlistedPrivilegedPath(pathname: string): boolean {
  return PRIVILEGED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Copy request headers for upstream fetch; drop hop-by-hop, cookie, auth. */
function forwardRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_REQUEST_HEADERS.has(lower)) {
      continue;
    }
    if (lower === "cookie" || lower === "authorization") {
      continue;
    }
    headers.set(key, value);
  }
  return headers;
}

/**
 * Copy upstream response headers for the client; drop hop-by-hop plus
 * content-encoding/length (undici already decompressed the body).
 */
function forwardResponseHeaders(upstream: Headers): Headers {
  const headers = new Headers();
  for (const [key, value] of upstream.entries()) {
    if (HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      continue;
    }
    headers.set(key, value);
  }
  return headers;
}

/**
 * Server-side fetch to the cloud API (RSC loaders, settings sync).
 * Forwards Clerk session as Bearer; never sends cookies. Vercel verifies.
 */
export async function fetchCloudApi(
  pathWithQuery: string,
  init: RequestInit = {}
): Promise<Response> {
  if (!isCloudSupabaseMode()) {
    throw new Error("fetchCloudApi called outside cloud Supabase mode.");
  }

  const token = await resolveSessionTokenForCloud();
  if (!token) {
    throw new Error("Missing Clerk session token for cloud API.");
  }

  const path = pathWithQuery.startsWith("/")
    ? pathWithQuery
    : `/${pathWithQuery}`;
  const pathname = path.split("?")[0] ?? path;
  if (!isAllowlistedPrivilegedPath(pathname)) {
    throw new Error(`Cloud fetch path not allowlisted: ${path}`);
  }

  const url = `${getCloudApiOrigin()}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
}

/**
 * Proxy an incoming API request to Vercel when in cloud Supabase mode.
 * Auth is enforced on Vercel. Local only forwards the session JWT.
 */
export async function maybeProxyPrivilegedRequest(
  request: Request
): Promise<Response | null> {
  if (!isCloudSupabaseMode()) {
    return null;
  }

  const url = new URL(request.url);
  if (!isAllowlistedPrivilegedPath(url.pathname)) {
    return null;
  }

  const method = request.method.toUpperCase();
  const token = await resolveSessionTokenForCloud(request);
  if (!token) {
    return unauthorized();
  }

  const target = `${getCloudApiOrigin()}${url.pathname}${url.search}`;
  const headers = forwardRequestHeaders(request);
  headers.set("Authorization", `Bearer ${token}`);

  const hasBody = method !== "GET" && method !== "HEAD";
  const upstream = await fetch(target, {
    method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: forwardResponseHeaders(upstream.headers),
  });
}
