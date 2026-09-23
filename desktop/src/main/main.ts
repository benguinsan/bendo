import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { getBendoAppUrl, isSmokeMode } from "./bendo-url";
import { ensureHarnessServer, stopSpawnedHarness } from "./spawn-harness";
import { ensureBendoServer, stopSpawnedNext } from "./spawn-next";

const isMac = process.platform === "darwin";
const SMOKE_TIMEOUT_MS = 30_000;

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

  return win;
}

// Show the offline page with a reason message.
async function showOffline(win: BrowserWindow, reason: string): Promise<void> {
  const fileUrl = pathToFileURL(offlinePagePath());
  fileUrl.searchParams.set("reason", reason);
  await win.loadURL(fileUrl.href);
}

async function ensureLocalHarness(bendoUrl: string): Promise<void> {
  const harness = await ensureHarnessServer(bendoUrl);
  if (!harness.ok) {
    console.warn(
      `[harness] Not available (${harness.reason}). Bendo will load; Agent chat stays offline until the bridge is up.`
    );
  }
}

async function loadBendo(win: BrowserWindow): Promise<boolean> {
  const url = getBendoAppUrl();
  const ensured = await ensureBendoServer(url);

  if (!ensured.ok) {
    console.error(`Bendo not reachable at ${url}: ${ensured.reason}`);
    await showOffline(win, ensured.reason);
    return false;
  }

  // Soft-fail: harness must not block the Bendo window.
  await ensureLocalHarness(url);

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

app.whenReady().then(() => {
  registerIpc();
  const win = createWindow();

  if (isSmokeMode()) {
    void runSmoke(win);
    return;
  }

  void loadBendo(win);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const next = createWindow();
      void loadBendo(next);
    }
  });
});

app.on("before-quit", () => {
  stopSpawnedHarness();
  stopSpawnedNext();
});

app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});
