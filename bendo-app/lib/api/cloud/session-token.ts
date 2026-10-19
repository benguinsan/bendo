import "server-only";
import { cookies } from "next/headers";

/**
 * Read Clerk session JWT from Authorization Bearer or `__session` cookie.
 * Does not verify locally — Vercel `auth()` verifies when the token is forwarded.
 */

const SESSION_COOKIE = "__session";

function bearerFromAuthorization(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const prefix = "bearer ";
  if (
    header.length > prefix.length &&
    header.toLowerCase().startsWith(prefix)
  ) {
    const token = header.slice(prefix.length).trim();
    return token || null;
  }
  return null;
}

/** Parse `__session` from a raw Cookie header (Route Handler request). */
function sessionFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const name = trimmed.slice(0, eq).trim();
    if (name !== SESSION_COOKIE) {
      continue;
    }
    const value = trimmed.slice(eq + 1).trim();
    return value || null;
  }
  return null;
}

export async function getForwardableSessionToken(
  request?: Request
): Promise<string | null> {
  const fromAuth = bearerFromAuthorization(
    request?.headers.get("authorization") ?? null
  );
  if (fromAuth) {
    return fromAuth;
  }

  const fromRequestCookie = sessionFromCookieHeader(
    request?.headers.get("cookie") ?? null
  );
  if (fromRequestCookie) {
    return fromRequestCookie;
  }

  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value?.trim() || null;
}
