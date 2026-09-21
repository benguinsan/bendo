#!/usr/bin/env node
/**
 * Launch Bendo Desktop (keeps the window open).
 *
 * Usage (from desktop/):
 *   npm start
 *   npm run app
 *   BENDO_APP_URL=http://127.0.0.1:3000 npm start
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const url = process.env.BENDO_APP_URL?.trim() || "http://127.0.0.1:3000";

async function checkHttp() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
    });
    console.log(`[app] Bendo reachable — ${url}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[app] Bendo not reachable yet — ${url}`);
    console.warn(`  ${message}`);
    console.warn(
      "  Start bendo-app (docker compose up / npm run dev). Offline page will offer Retry."
    );
    return false;
  } finally {
    clearTimeout(timer);
  }
}

await checkHttp();

const electronBin = /** @type {string} */ (require("electron"));
const env = {
  ...process.env,
  BENDO_APP_URL: url,
};
delete env.ELECTRON_RUN_AS_NODE;
delete env.DESKTOP_SMOKE;

const child = spawn(electronBin, ["."], {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
    return;
  }
  process.exit(code ?? 0);
});
