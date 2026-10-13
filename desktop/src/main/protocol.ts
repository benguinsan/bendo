import path from "node:path";

import { app, BrowserWindow } from "electron";

import { getBendoAppUrl } from "./bendo-url";

/** Custom URL scheme — OS opens Electron instead of leaving the user on a browser tab. */
export const BENDO_PROTOCOL = "bendo";

let mainWindowRef: BrowserWindow | null = null;
let pendingProtocolUrl: string | null = null;
/** False until the first `loadBendo` finishes — avoids racing protocol loadURL vs app boot. */
let initialLoadComplete = false;

export function setProtocolMainWindow(win: BrowserWindow | null): void {
  mainWindowRef = win;
}

/** Call after the first `loadBendo(win)` settles (ok or offline). */
export function markProtocolInitialLoadComplete(): void {
  initialLoadComplete = true;
}

function queueProtocolUrl(raw: string): void {
  pendingProtocolUrl = raw;
}

export function registerBendoProtocolClient(): void {
  // Dev (electron .): register with execPath + entry so macOS/Windows route bendo:// here.
  if (process.defaultApp) {
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
    if (entry) {
      app.setAsDefaultProtocolClient(BENDO_PROTOCOL, process.execPath, [entry]);
      return;
    }
  }
  app.setAsDefaultProtocolClient(BENDO_PROTOCOL);
}

function isAllowedCallbackTarget(target: URL): boolean {
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return false;
  }

  const appUrl = new URL(getBendoAppUrl());
  const loopback = (host: string) =>
    host === "127.0.0.1" || host === "localhost" || host === "::1";

  if (target.origin === appUrl.origin) {
    return true;
  }

  // localhost ↔ 127.0.0.1 on the same port as the running Bendo URL.
  return (
    loopback(target.hostname) &&
    loopback(appUrl.hostname) &&
    target.port === appUrl.port
  );
}

/**
 * Parse `bendo://auth/callback?target=<encoded http URL>`.
 * Returns the http(s) URL to load in the BrowserWindow, or null if invalid.
 */
export function parseBendoProtocolUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== `${BENDO_PROTOCOL}:`) {
    return null;
  }

  // bendo://auth/callback?target=… → hostname "auth", pathname "/callback"
  const hostPath = `${parsed.hostname}${parsed.pathname}`
    .replace(/\/+/gu, "/")
    .replace(/^\/+|\/+$/gu, "");
  if (hostPath !== "auth/callback") {
    return null;
  }

  const targetRaw = parsed.searchParams.get("target");
  if (!targetRaw?.trim()) {
    return null;
  }

  let target: URL;
  try {
    target = new URL(targetRaw);
  } catch {
    return null;
  }

  if (!isAllowedCallbackTarget(target)) {
    console.warn(`[protocol] Rejected callback target: ${targetRaw}`);
    return null;
  }

  return target.toString();
}

function focusWindow(win: BrowserWindow): void {
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
}

/**
 * Handle an incoming bendo:// URL: focus main window and load the local callback.
 * Before initial load completes (or if no window yet), queue and wait for flush.
 */
export async function handleBendoProtocolUrl(raw: string): Promise<void> {
  const target = parseBendoProtocolUrl(raw);
  if (!target) {
    console.warn(`[protocol] Ignored invalid URL: ${raw}`);
    return;
  }

  if (!initialLoadComplete) {
    queueProtocolUrl(raw);
    return;
  }

  const win =
    mainWindowRef && !mainWindowRef.isDestroyed()
      ? mainWindowRef
      : BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());

  if (!win) {
    queueProtocolUrl(raw);
    return;
  }

  try {
    await win.loadURL(target);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[protocol] Failed to load ${target}:`, message);
  }
  focusWindow(win);
}

/**
 * Apply a protocol URL queued before the window existed or before initial load.
 * Caller must `markProtocolInitialLoadComplete()` first.
 */
export async function flushPendingProtocolUrl(): Promise<void> {
  if (!pendingProtocolUrl) {
    return;
  }
  const url = pendingProtocolUrl;
  pendingProtocolUrl = null;
  await handleBendoProtocolUrl(url);
}

/** Extract bendo:// from process argv (Windows / Linux second instance). */
export function findProtocolUrlInArgv(argv: string[]): string | undefined {
  return argv.find((arg) => arg.startsWith(`${BENDO_PROTOCOL}://`));
}
