const DEFAULT_BENDO_APP_URL = "http://127.0.0.1:3000";
const DEFAULT_HEALTH_PATH = "/api/health";

export type ResolveBendoAppUrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: string; fallbackUrl: string };

/**
 * Only `http:` and `https:` are allowed.
 * Rejects `data:`, `file:`, and other schemes so they cannot reach `loadURL` / `fetch`.
 */
export function resolveBendoAppUrl(
  raw: string | undefined
): ResolveBendoAppUrlResult {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { ok: true, url: DEFAULT_BENDO_APP_URL };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      reason: `Invalid BENDO_APP_URL (not a valid URL): ${trimmed}`,
      fallbackUrl: DEFAULT_BENDO_APP_URL,
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: `Invalid BENDO_APP_URL protocol "${parsed.protocol}" (only http: and https: are allowed): ${trimmed}`,
      fallbackUrl: DEFAULT_BENDO_APP_URL,
    };
  }

  return { ok: true, url: parsed.toString() };
}

/** Default local Bendo (Docker / Next). Override with BENDO_APP_URL (http/https only). */
export function getBendoAppUrl(): string {
  const result = resolveBendoAppUrl(process.env.BENDO_APP_URL);
  if (!result.ok) {
    console.error(`${result.reason}. Using ${result.fallbackUrl}`);
    return result.fallbackUrl;
  }
  return result.url;
}

/**
 * Health probe URL for spawn/attach. Override with `BENDO_HEALTH_URL`,
 * otherwise `{BENDO_APP_URL origin}/api/health`.
 */
export function getBendoHealthUrl(): string {
  const raw = process.env.BENDO_HEALTH_URL?.trim();
  if (raw) {
    const resolved = resolveBendoAppUrl(raw);
    if (!resolved.ok) {
      console.error(
        `${resolved.reason.replaceAll("BENDO_APP_URL", "BENDO_HEALTH_URL")}. Falling back to default health path.`
      );
    } else {
      return resolved.url;
    }
  }

  const appUrl = new URL(getBendoAppUrl());
  return new URL(DEFAULT_HEALTH_PATH, appUrl.origin).toString();
}

export function isSmokeMode(): boolean {
  return process.env.DESKTOP_SMOKE === "1";
}

export { DEFAULT_BENDO_APP_URL };
