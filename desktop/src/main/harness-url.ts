const DEFAULT_HARNESS_URL = "http://127.0.0.1:3080";
const DEFAULT_BRIDGE_HEALTH_PATH = "/bendo-chat";

export type ResolveHarnessUrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: string; fallbackUrl: string };

/**
 * Only `http:` and `https:` are allowed.
 * Rejects `data:`, `file:`, and other schemes so they cannot reach `fetch`.
 */
export function resolveHarnessUrl(
  raw: string | undefined
): ResolveHarnessUrlResult {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { ok: true, url: DEFAULT_HARNESS_URL };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      reason: `Invalid BENDO_HARNESS_URL (not a valid URL): ${trimmed}`,
      fallbackUrl: DEFAULT_HARNESS_URL,
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: `Invalid BENDO_HARNESS_URL protocol "${parsed.protocol}" (only http: and https: are allowed): ${trimmed}`,
      fallbackUrl: DEFAULT_HARNESS_URL,
    };
  }

  return { ok: true, url: parsed.toString() };
}

/** Default local dsh web (chat-bridge host). Override with BENDO_HARNESS_URL. */
export function getHarnessUrl(): string {
  const result = resolveHarnessUrl(process.env.BENDO_HARNESS_URL);
  if (!result.ok) {
    console.error(`${result.reason}. Using ${result.fallbackUrl}`);
    return result.fallbackUrl;
  }
  return result.url;
}

/**
 * Health probe URL for harness spawn/attach. Override with `BENDO_HARNESS_HEALTH_URL`,
 * otherwise `{BENDO_HARNESS_URL origin}/bendo-chat`.
 */
export function getHarnessHealthUrl(): string {
  const raw = process.env.BENDO_HARNESS_HEALTH_URL?.trim();
  if (raw) {
    const resolved = resolveHarnessUrl(raw);
    if (!resolved.ok) {
      console.error(
        `${resolved.reason.replaceAll("BENDO_HARNESS_URL", "BENDO_HARNESS_HEALTH_URL")}. Falling back to default bridge health path.`
      );
    } else {
      return resolved.url;
    }
  }

  const harnessUrl = new URL(getHarnessUrl());
  return new URL(DEFAULT_BRIDGE_HEALTH_PATH, harnessUrl.origin).toString();
}

export { DEFAULT_HARNESS_URL };
