/** Path Clerk / OAuth should return to on local Next before jumping into Electron. */
export const DESKTOP_HANDOFF_PATH = "/auth/desktop-handoff";

export const BENDO_PROTOCOL_CALLBACK = "bendo://auth/callback";

/**
 * Absolute handoff URL for Electron OAuth (Clerk must allow this http origin).
 * Example: http://127.0.0.1:3000/auth/desktop-handoff?next=%2Fsettings
 */
export function buildDesktopHandoffUrl(
  appOrigin: string,
  nextPath: string
): string {
  const origin = appOrigin.replace(/\/$/u, "");
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  const url = new URL(DESKTOP_HANDOFF_PATH, `${origin}/`);
  url.searchParams.set("next", next);
  return url.toString();
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
