const DEFAULT_BENDO_APP_URL = "http://127.0.0.1:3000";

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

export function isSmokeMode(): boolean {
  return process.env.DESKTOP_SMOKE === "1";
}

export { DEFAULT_BENDO_APP_URL };
