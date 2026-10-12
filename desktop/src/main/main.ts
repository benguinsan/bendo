import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { getBendoAppUrl, isSmokeMode } from "./bendo-url";
import {
  loadModelConfig,
  saveModelConfig,
} from "./model-config-store";
import { attachOAuthExternalNavigation } from "./oauth-navigation";
import { openExternalUrl } from "./open-external";
import {
  findProtocolUrlInArgv,
  flushPendingProtocolUrl,
  handleBendoProtocolUrl,
  registerBendoProtocolClient,
  setProtocolMainWindow,
} from "./protocol";
import { initRuntimeLog } from "./runtime-log";
import { ensureRuntimes } from "./runtime-manager";
import { stopRuntimes } from "./runtime-shutdown";

const isMac = process.platform === "darwin";
const SMOKE_TIMEOUT_MS = 30_000;

// Single instance so bendo:// from the browser reaches this process (esp. Windows).
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const protocolUrl = findProtocolUrlInArgv(argv);
    if (protocolUrl) {
      void handleBendoProtocolUrl(protocolUrl);
      return;
    }
    const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
    if (win) {
      if (win.isMinimized()) {
        win.restore();
      }
      win.show();
      win.focus();
    }
  });
}

// macOS: protocol open may arrive before ready.
app.on("open-url", (event, url) => {
  event.preventDefault();
  void handleBendoProtocolUrl(url);
});

// Load the offline page from the static folder.
function offlinePagePath(): string {
  return path.join(app.getAppPath(), "static", "offline.html");
}

// Create a new browser window.
function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    title: "Bendo",
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  win.on("closed", () => {
    if (BrowserWindow.getAllWindows().every((w) => w.isDestroyed())) {
      setProtocolMainWindow(null);
    }
  });

  // Discord / Google / Clerk OAuth → OS browser; keep Bendo shell on local app URL.
  attachOAuthExternalNavigation(win);
  setProtocolMainWindow(win);

  return win;
}

// Show the offline page with a reason message.
async function showOffline(win: BrowserWindow, reason: string): Promise<void> {
  const fileUrl = pathToFileURL(offlinePagePath());
  fileUrl.searchParams.set("reason", reason);
  await win.loadURL(fileUrl.href);
}

async function loadBendo(win: BrowserWindow): Promise<boolean> {
  const url = getBendoAppUrl();
  const { bendo } = await ensureRuntimes(url);

  if (!bendo.ok) {
    console.error(`Bendo not reachable at ${url}: ${bendo.reason}`);
    await showOffline(win, bendo.reason);
    return false;
  }

  try {
    await win.loadURL(url);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to load Bendo at ${url}:`, message);
    await showOffline(win, message);
    return false;
  }
}

// Register IPC handlers between main and preload/renderer.
function registerIpc(): void {
  ipcMain.handle("bendo:get-url", () => getBendoAppUrl());

  ipcMain.handle("bendo:reload", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return { ok: false as const };
    }
    const ok = await loadBendo(win);
    return { ok };
  });

  ipcMain.handle("bendo:model-config:save", async (_event, payload: unknown) =>
    saveModelConfig(payload)
  );

  ipcMain.handle("bendo:model-config:load", () => loadModelConfig());

  ipcMain.handle("bendo:open-external", async (_event, url: unknown) =>
    openExternalUrl(url)
  );
}

async function runSmoke(win: BrowserWindow): Promise<void> {
  const url = getBendoAppUrl();
  console.log(`[smoke] Checking ${url}…`);

  const timer = setTimeout(() => {
    console.error("[smoke] Timed out");
    app.exit(1);
  }, SMOKE_TIMEOUT_MS);

  const loadFinished = new Promise<boolean>((resolve) => {
    win.webContents.once("did-finish-load", () => resolve(true));
    win.webContents.once("did-fail-load", (_e, _code, desc) => {
      console.error(`[smoke] FAIL — did-fail-load: ${desc}`);
      resolve(false);
    });
  });

  const started = await loadBendo(win);
  if (!started) {
    clearTimeout(timer);
    console.error(
      "[smoke] FAIL — start bendo-app (Docker/Next), then re-run. Smoke does not spawn Next or harness."
    );
    app.exit(1);
    return;
  }

  const ok = await loadFinished;
  clearTimeout(timer);
  if (!ok) {
    app.exit(1);
    return;
  }

  console.log("[smoke] OK — Bendo loaded in Electron");
  app.exit(0);
}

if (gotTheLock) {
  app.whenReady().then(() => {
    initRuntimeLog();
    registerBendoProtocolClient();
    registerIpc();
    const win = createWindow();

    if (isSmokeMode()) {
      void runSmoke(win);
      return;
    }

    void loadBendo(win).then(() => {
      void flushPendingProtocolUrl();
    });

    // Cold-start via protocol on Win/Linux: URL may be in argv.
    const launchProtocol = findProtocolUrlInArgv(process.argv);
    if (launchProtocol) {
      void handleBendoProtocolUrl(launchProtocol);
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        const next = createWindow();
        void loadBendo(next);
      }
    });
  });

  app.on("before-quit", () => {
    stopRuntimes();
  });

  app.on("window-all-closed", () => {
    if (!isMac) {
      app.quit();
    }
  });
}
