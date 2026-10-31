// Electron E2E for frame-trust: needs a GUI-capable machine (display / Electron).
// Headless CI without a display will fail to launch Chromium — run locally or on
// a desktop runner. Not wired into CI workflows.
const { app, BrowserWindow, ipcMain } = require("electron");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const crypto = require("node:crypto");

const DIST =
  process.env.DIST || path.join(__dirname, "..", "..", "dist");
const PORT = Number(process.env.PORT || 38931);
process.env.BENDO_DESKTOP_SESSION_SECRET = "test-secret";
process.env.BENDO_APP_URL = `http://127.0.0.1:${PORT}`;

const { installFrameTrustHooks, isFrameTrusted } = require(
  path.join(DIST, "main/frame-trust.js")
);

function proofFor(secret, nonce) {
  return crypto
    .createHmac("sha256", secret)
    .update(`bendo-desktop-proof:v1:${nonce}`)
    .digest("hex");
}

function startServer(port, secret) {
  return new Promise((resolve) => {
    const server = http.createServer((req, rsp) => {
      const nonce = req.headers["x-bendo-desktop-nonce"];
      const h = { "content-type": "text/html" };
      if (secret && nonce) {
        h["x-bendo-desktop-proof"] = proofFor(secret, nonce);
      }
      const url = new URL(req.url, "http://x");
      if (url.pathname === "/redirect") {
        rsp.writeHead(302, { ...h, location: "/page" });
        return rsp.end();
      }
      if (url.pathname === "/etag") {
        h.etag = '"v1"';
        h["cache-control"] = "no-cache";
        if (req.headers["if-none-match"] === '"v1"') {
          rsp.writeHead(304, h);
          return rsp.end();
        }
        rsp.writeHead(200, h);
        return rsp.end("<html><body>etag</body></html>");
      }
      rsp.writeHead(200, h);
      rsp.end(`<html><body>${url.pathname}</body></html>`);
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bendo-trust-"));
  const offline = path.join(tmpDir, "offline.html");
  fs.writeFileSync(offline, "<html><body>offline</body></html>");

  const cleanup = () => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  };

  ipcMain.handle("t:check", (e) => isFrameTrusted(e));
  installFrameTrustHooks();

  await startServer(PORT, "test-secret"); // behaves like the real Next
  await startServer(PORT + 1, null); // no proof (fake / attached)
  await startServer(PORT + 2, "other-secret"); // wrong secret

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const check = async () => {
    try {
      return await win.webContents.executeJavaScript("window.t.check()");
    } catch (e) {
      return `ERR ${e.message}`;
    }
  };

  const results = [];
  const step = async (name, action, expect) => {
    try {
      await action();
    } catch (e) {
      // aborted navigations are fine for some steps
    }
    await sleep(400);
    const got = await check();
    const ok = got === expect;
    results.push({ name, expect, got, ok });
    console.log(`${ok ? "PASS" : "FAIL"} ${name} (expect=${expect} got=${got})`);
  };

  const base = `http://127.0.0.1:${PORT}`;
  await step("real page", () => win.loadURL(`${base}/page`), true);
  await step("real, second cross-doc nav", () => win.loadURL(`${base}/other`), true);
  await step("real via 302 redirect", () => win.loadURL(`${base}/redirect`), true);
  await step("etag first load (200)", () => win.loadURL(`${base}/etag`), true);
  await step("etag reload (304 revalidation)", () => win.webContents.reload(), true);
  await step(
    "same-document pushState keeps trust",
    () => win.webContents.executeJavaScript("history.pushState({}, '', '/pushed')"),
    true
  );
  await step("offline file page (not Bendo)", () => win.loadURL(`file://${offline}`), false);
  await step("file -> real (process swap?)", () => win.loadURL(`${base}/page`), true);
  await step("no-proof server", () => win.loadURL(`http://127.0.0.1:${PORT + 1}/page`), false);
  await step("wrong-secret server", () => win.loadURL(`http://127.0.0.1:${PORT + 2}/page`), false);
  await step("back to real", () => win.loadURL(`${base}/page`), true);
  await step(
    "JS navigates real -> foreign (trust must clear)",
    () => win.webContents.executeJavaScript(`location.href='http://127.0.0.1:${PORT + 1}/p'`),
    false
  );
  await step("alias localhost (origin mismatch)", () => win.loadURL(`http://localhost:${PORT}/page`), false);
  await step("real again after alias", () => win.loadURL(`${base}/page`), true);

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`SUMMARY ${passed} PASS, ${failed} FAIL of ${results.length}`);
  cleanup();
  app.exit(failed === 0 ? 0 : 1);
});

setTimeout(() => {
  console.log("TIMEOUT");
  app.exit(2);
}, 90000);
