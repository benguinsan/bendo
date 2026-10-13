/** Path Clerk / OAuth should return to on local Next before jumping into Electron. */
export const DESKTOP_HANDOFF_PATH = "/auth/desktop-handoff";

export const BENDO_PROTOCOL_CALLBACK = "bendo://auth/callback";

/**
 * Keep `next` as a same-origin app path. Protocol-relative (`//host/…`) and
 * backslash forms resolve off-origin in `new URL` — fall back to `/`.
 */
export function sanitizeHandoffNextPath(
  nextParam: string | null | undefined,
  currentOrigin: string
): string {
  const raw = (nextParam ?? "/").trim() || "/";
  // Protocol-relative, backslash host tricks, or absolute URLs with a scheme.
  if (
    raw.startsWith("//") ||
    raw.includes("\\") ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/u.test(raw)
  ) {
    return "/";
  }

  const nextPath = raw.startsWith("/") ? raw : `/${raw}`;
  try {
    const resolved = new URL(nextPath, currentOrigin);
    if (resolved.origin !== new URL(currentOrigin).origin) {
      return "/";
    }
    const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    return path || "/";
  } catch {
    return "/";
  }
}

/**
 * Absolute handoff URL for Electron OAuth (Clerk must allow this http origin).
 * Example: http://127.0.0.1:3000/auth/desktop-handoff?next=%2Fsettings
 */
export function buildDesktopHandoffUrl(
  appOrigin: string,
  nextPath: string
): string {
  const origin = appOrigin.replace(/\/$/u, "");
  const next = sanitizeHandoffNextPath(nextPath, origin);
  const url = new URL(DESKTOP_HANDOFF_PATH, `${origin}/`);
  url.searchParams.set("next", next);
  return url.toString();
}

/**
 * Build the in-app http(s) URL that `bendo://` should load after OAuth handoff.
 * Copies non-`next` query params and hash from the handoff page URL.
 */
export function buildHandoffCallbackTargetHttpUrl(currentHref: string): string {
  const current = new URL(currentHref);
  const nextPath = sanitizeHandoffNextPath(
    current.searchParams.get("next"),
    current.origin
  );
  const target = new URL(nextPath, current.origin);
  if (target.origin !== current.origin) {
    return new URL("/", current.origin).toString();
  }

  for (const [key, value] of current.searchParams.entries()) {
    if (key === "next") {
      continue;
    }
    target.searchParams.set(key, value);
  }
  target.hash = current.hash;
  return target.toString();
}

/**
 * Build bendo:// URL that Electron will open, loading `targetHttpUrl` in-app.
 */
export function buildBendoProtocolCallbackUrl(targetHttpUrl: string): string {
  const url = new URL(BENDO_PROTOCOL_CALLBACK);
  url.searchParams.set("target", targetHttpUrl);
  return url.toString();
}

/** Resolve app origin in the Electron shell (falls back to window.location). */
export async function resolveDesktopAppOrigin(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const api = window.bendoDesktop;
  if (!api?.getAppUrl) {
    return null;
  }
  try {
    const appUrl = await api.getAppUrl();
    return new URL(appUrl).origin;
  } catch {
    return window.location.origin;
  }
}
