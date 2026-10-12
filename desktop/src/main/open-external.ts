import { shell } from "electron";

export type OpenExternalResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validate then open a URL in the OS default browser.
 * Only http: / https: — blocks file:, javascript:, etc.
 */
export function parseOpenExternalUrl(
  raw: unknown
): { ok: true; url: string } | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "URL is required." };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Invalid URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      error: `Unsupported URL protocol "${parsed.protocol}" (only http: and https: are allowed).`,
    };
  }

  return { ok: true, url: parsed.toString() };
}

export async function openExternalUrl(
  raw: unknown
): Promise<OpenExternalResult> {
  const parsed = parseOpenExternalUrl(raw);
  if (!parsed.ok) {
    return parsed;
  }

  try {
    await shell.openExternal(parsed.url);
    return { ok: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message || "Could not open URL." };
  }
}
