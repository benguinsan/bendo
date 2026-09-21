import { app, BrowserWindow } from "electron";
import path from "node:path";

/**
 * Dev default: Bendo via Docker / local Next on the host.
 * Override: BENDO_APP_URL=http://127.0.0.1:3000
 */
const BENDO_APP_URL =
  process.env.BENDO_APP_URL?.trim() || "http://127.0.0.1:3000";

const isMac = process.platform === "darwin";

function createWindow(): void {
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

  void win.loadURL(BENDO_APP_URL).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to load Bendo at ${BENDO_APP_URL}:`, message);
    console.error("Start bendo-app (Docker or Next), then retry.");
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});
