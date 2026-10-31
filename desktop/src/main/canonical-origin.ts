import { getBendoAppUrl } from "./bendo-url";

/** Strip IPv6 brackets: `[::1]` → `::1`. */
export function stripIpv6Brackets(hostname: string): string {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

export function isLoopbackHostname(hostname: string): boolean {
  const host = stripIpv6Brackets(hostname).toLowerCase();
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

/**
 * Loopback app URLs always resolve to `127.0.0.1` (same protocol + port).
 * Remote URLs keep their normal origin (never provable for privileged IPC).
 */
export function canonicalAppOrigin(): string {
  const appUrl = new URL(getBendoAppUrl());
  if (isLoopbackHostname(appUrl.hostname)) {
    const portSuffix = appUrl.port ? `:${appUrl.port}` : "";
    return `${appUrl.protocol}//127.0.0.1${portSuffix}`;
  }
  return appUrl.origin;
}

/**
 * If `url` is http(s) loopback on the configured app port, rewrite to the
 * canonical origin (path/query/hash preserved). Otherwise null.
 */
export function canonicalizeLoopbackUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  if (!isLoopbackHostname(parsed.hostname)) {
    return null;
  }

  let appUrl: URL;
  try {
    appUrl = new URL(getBendoAppUrl());
  } catch {
    return null;
  }

  if (!isLoopbackHostname(appUrl.hostname)) {
    return null;
  }
  if (parsed.port !== appUrl.port) {
    return null;
  }

  return `${canonicalAppOrigin()}${parsed.pathname}${parsed.search}${parsed.hash}`;
}
