import "server-only";
import { resolveSessionTokenForCloud } from "@/lib/api/cloud-auth";
import { getCloudApiOrigin, isCloudPrivilegeMode } from "@/lib/api/cloud-mode";
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

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
]);

export {
  getCloudApiOrigin,
  hasLocalSupabaseAdmin,
  isCloudPrivilegeMode,
} from "@/lib/api/cloud-mode";

function isAllowlistedPrivilegedPath(pathname: string): boolean {
  return PRIVILEGED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function forwardRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) {
      continue;
    }
    if (key.toLowerCase() === "cookie") {
      continue;
    }
    if (key.toLowerCase() === "authorization") {
      continue;
    }
    headers.set(key, value);
  }
  return headers;
}

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
 * Server-side fetch to the cloud API (RSC loaders, settings sync, /api/me).
 * Forwards Clerk session as Bearer; never sends cookies. Vercel verifies.
 */
export async function fetchCloudApi(
  pathWithQuery: string,
  init: RequestInit = {}
): Promise<Response> {
  if (!isCloudPrivilegeMode()) {
    throw new Error("fetchCloudApi called outside cloud privilege mode.");
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
 * Proxy an incoming API request to Vercel when in cloud privilege mode.
 * Auth is enforced on Vercel (secret keys). Local only forwards the session JWT.
 */
export async function maybeProxyPrivilegedRequest(
  request: Request
): Promise<Response | null> {
  if (!isCloudPrivilegeMode()) {
    return null;
  }

  const url = new URL(request.url);
  if (!isAllowlistedPrivilegedPath(url.pathname)) {
    return null;
  }

  const token = await resolveSessionTokenForCloud(request);
  if (!token) {
    return unauthorized();
  }

  const target = `${getCloudApiOrigin()}${url.pathname}${url.search}`;
  const headers = forwardRequestHeaders(request);
  headers.set("Authorization", `Bearer ${token}`);

  const method = request.method.toUpperCase();
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
