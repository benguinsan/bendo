#!/usr/bin/env node
/**
 * Automated smoke only: HTTP check → Electron with DESKTOP_SMOKE=1 → exit.
 * To use the app (window stays open), run: npm start
 *
 * Usage (from desktop/):
 *   npm run test:smoke
 *   BENDO_APP_URL=http://127.0.0.1:3000 npm run test:smoke
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const DEFAULT_BENDO_APP_URL = "http://127.0.0.1:3000";

/**
 * @param {string | undefined} raw
 * @returns {{ ok: true, url: string } | { ok: false, reason: string }}
 */
function resolveBendoAppUrl(raw) {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { ok: true, url: DEFAULT_BENDO_APP_URL };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      reason: `Invalid BENDO_APP_URL (not a valid URL): ${trimmed}`,
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: `Invalid BENDO_APP_URL protocol "${parsed.protocol}" (only http: and https: are allowed): ${trimmed}`,
    };
  }

  return { ok: true, url: parsed.toString() };
}

const resolved = resolveBendoAppUrl(process.env.BENDO_APP_URL);
if (!resolved.ok) {
  console.error(`[smoke] ${resolved.reason}`);
  process.exit(1);
}
const url = resolved.url;

async function checkHttp() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
    });
    console.log(`[smoke] HTTP OK — ${url}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[smoke] HTTP FAIL — ${url}`);
    console.error(`  ${message}`);
    console.error(
      "  Start bendo-app (docker compose up / npm run dev), then retry."
    );
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function runElectronSmoke() {
  return new Promise((resolve) => {
    const electronBin = /** @type {string} */ (require("electron"));
    const env = {
      ...process.env,
      DESKTOP_SMOKE: "1",
      BENDO_APP_URL: url,
    };
    // Cursor/CI sometimes sets this; it makes `require('electron')` return a path string.
    delete env.ELECTRON_RUN_AS_NODE;

    const child = spawn(electronBin, ["."], {
      cwd: root,
      env,
      stdio: "inherit",
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        console.error(`[smoke] Electron killed by ${signal}`);
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

const httpOk = await checkHttp();
if (!httpOk) {
  process.exit(1);
}

const code = await runElectronSmoke();
process.exit(code);
