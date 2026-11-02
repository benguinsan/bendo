/**
 * Shared Electron-as-Node harness smoke boot (prepare + CI verify).
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

/** Alternate port so prepare smoke does not collide with a running :3080 harness. */
export const SMOKE_PORT = 13_080;
export const SMOKE_HEALTH_URL = `http://127.0.0.1:${SMOKE_PORT}/bendo-chat`;
const SMOKE_TIMEOUT_MS = 90_000;
const SMOKE_POLL_MS = 500;
const DORO_PATCH = "./bendo-agent(doro)/cordis.yml";
const DSH_BIN_REL = path.join("apps", "cli", "lib", "bin.js");

/** Promise that resolves after `ms` milliseconds. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True when `GET url` returns HTTP 2xx within a short timeout. */
function httpGetOk(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode != null && res.statusCode >= 200 && res.statusCode < 300);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/** Best-effort terminate of a spawned child and its process group/tree. */
function killChildTree(child) {
  const pid = child.pid;
  if (pid == null) {
    return;
  }
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      return;
    }
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  } catch {
    // already exited
  }
}

/**
 * Boot slim harness briefly with Electron-as-Node (same as packaged spawn);
 * require bridge health 2xx.
 * @param {string} harnessDir
 * @param {string} electronBin
 * @returns {Promise<{ ok: true, skipped: boolean } | { ok: false, reason: string }>}
 */
export async function smokeBoot(harnessDir, electronBin) {
  if (process.env.BENDO_HARNESS_SKIP_SMOKE?.trim() === "1") {
    console.log("[build:harness] Smoke skipped (BENDO_HARNESS_SKIP_SMOKE=1)");
    return { ok: true, skipped: true };
  }

  if (await httpGetOk(SMOKE_HEALTH_URL)) {
    return {
      ok: false,
      reason: `Smoke port ${SMOKE_PORT} already in use (${SMOKE_HEALTH_URL}). Free it and re-run.`,
    };
  }

  const dshHome = fs.mkdtempSync(path.join(os.tmpdir(), "bendo-harness-smoke-"));
  const secret = `bendo-smoke-${Date.now()}`;
  const dshBin = path.join(harnessDir, DSH_BIN_REL);
  // Match packaged spawn: HMR requires --expose-internals (see vendor/hmr).
  const args = [
    "--expose-internals",
    dshBin,
    "web",
    "--patch",
    DORO_PATCH,
    "--no-open",
    "--port",
    String(SMOKE_PORT),
  ];

  console.log(
    `[build:harness] Smoke: Electron-as-Node ${path.basename(electronBin)} ${args.join(" ")}`
  );
  const child = spawn(electronBin, args, {
    cwd: harnessDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      DSH_HOME: dshHome,
      DSH_CHAT_BRIDGE_SECRET: secret,
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });

  let stderrTail = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk) => {
    stderrTail = `${stderrTail}${chunk}`.slice(-4000);
  });
  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => {
    stderrTail = `${stderrTail}${chunk}`.slice(-4000);
  });

  const started = Date.now();
  let healthy = false;
  let earlyExit = null;

  child.once("exit", (code, signal) => {
    earlyExit =
      signal != null ? `signal ${signal}` : `code ${code ?? "unknown"}`;
  });

  while (Date.now() - started < SMOKE_TIMEOUT_MS) {
    if (earlyExit) {
      break;
    }
    if (await httpGetOk(SMOKE_HEALTH_URL)) {
      healthy = true;
      break;
    }
    await sleep(SMOKE_POLL_MS);
  }

  killChildTree(child);
  await sleep(300);
  try {
    fs.rmSync(dshHome, { recursive: true, force: true });
  } catch {
    // best effort
  }

  if (!healthy) {
    const detail = earlyExit
      ? `process exited (${earlyExit})`
      : `timeout after ${SMOKE_TIMEOUT_MS}ms`;
    return {
      ok: false,
      reason: `${detail}\n--- harness output (tail) ---\n${stderrTail}`,
    };
  }

  console.log(`[build:harness] Smoke OK — ${SMOKE_HEALTH_URL}`);
  return { ok: true, skipped: false };
}
