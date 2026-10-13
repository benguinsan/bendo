/**
 * Open a URL via Electron `bendoDesktop.openExternal` when available.
 * Returns true if Electron handled it; false → caller should use in-tab navigation.
 */
export async function tryOpenExternalUrl(url: string): Promise<boolean> {
  const api = window.bendoDesktop;
  if (!api?.openExternal) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const result = await api.openExternal(parsed.toString());
  return result.ok;
}

export function isBendoDesktopShell(): boolean {
  return typeof window !== "undefined" && Boolean(window.bendoDesktop);
}
