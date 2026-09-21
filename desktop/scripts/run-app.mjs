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
  console.error(`[app] ${resolved.reason}`);
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
