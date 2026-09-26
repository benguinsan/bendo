import type { ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

import {
  getNpmCommand,
  killProcessTree,
  shouldDetachChild,
  spawnCommand,
  spawnExecutable,
} from "../platform/process";
import { getBendoAppUrl, getBendoHealthUrl, isSmokeMode } from "./bendo-url";
import { isHealthy, waitForHealthy } from "./check-bendo";

const DEFAULT_SPAWN_TIMEOUT_MS = 60_000;
const WAIT_INTERVAL_MS = 500;
const DEFAULT_BRIDGE_URL = "http://127.0.0.1:3080/bendo-chat";

let ownedChild: ChildProcess | null = null;
/** Once true, spawn helpers refuse new spawns (quit / stopRuntimes). */
let shuttingDown = false;

export type EnsureBendoResult =
  | { ok: true; spawned: boolean }
  | { ok: false; reason: string };

function spawnTimeoutMs(): number {
  const raw = process.env.BENDO_SPAWN_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_SPAWN_TIMEOUT_MS;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    console.warn(
      `[next] Invalid BENDO_SPAWN_TIMEOUT_MS="${raw}"; using ${DEFAULT_SPAWN_TIMEOUT_MS}`
    );
    return DEFAULT_SPAWN_TIMEOUT_MS;
  }
  return n;
}

function portFromAppUrl(): string {
  try {
    const port = new URL(getBendoAppUrl()).port;
    return port || "3000";
  } catch {
    return "3000";
  }
}

/** Minimal KEY=VALUE loader for packaged Next (no dependency). */
function loadEnvFile(filePath: string): NodeJS.ProcessEnv {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const out: NodeJS.ProcessEnv = {};
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Resolve the Next app directory.
 * Packaged: `Resources/bendo-app`. Dev: `BENDO_APP_DIR` or sibling `../bendo-app`.
 */
export function resolveBendoAppDir():
  | { ok: true; dir: string }
  | { ok: false; reason: string } {
  const raw = process.env.BENDO_APP_DIR?.trim();
  let candidate: string;

  if (raw) {
    candidate = path.isAbsolute(raw)
      ? raw
      : path.resolve(process.cwd(), raw);
  } else if (app.isPackaged) {
    candidate = path.join(process.resourcesPath, "bendo-app");
  } else {
    candidate = path.resolve(app.getAppPath(), "..", "bendo-app");
  }

  let st: fs.Stats;
  try {
    st = fs.statSync(candidate);
  } catch {
    return {
      ok: false,
      reason: `bendo-app directory not found: ${candidate}`,
    };
  }

  if (!st.isDirectory()) {
    return {
      ok: false,
      reason: `BENDO_APP_DIR is not a directory: ${candidate}`,
    };
  }

  if (app.isPackaged) {
    const serverJs = path.join(candidate, "server.js");
    if (!fs.existsSync(serverJs)) {
      return {
        ok: false,
        reason: `Packaged Bendo missing server.js: ${serverJs}`,
      };
    }
  } else {
    const packageJson = path.join(candidate, "package.json");
    if (!fs.existsSync(packageJson)) {
      return {
        ok: false,
        reason: `Missing package.json in ${candidate}`,
      };
    }
  }

  return { ok: true, dir: candidate };
}

function pipeChildOutput(child: ChildProcess): void {
  const forward = (text: string, stream: "stdout" | "stderr") => {
    for (const line of text.split(/\r?\n/)) {
      if (!line) {
        continue;
      }
      if (stream === "stderr") {
        console.error(`[next] ${line}`);
      } else {
        console.log(`[next] ${line}`);
      }
    }
  };

  if (child.stdout) {
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => forward(chunk, "stdout"));
  }
  if (child.stderr) {
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => forward(chunk, "stderr"));
  }
}

function spawnErrorReason(
  error: NodeJS.ErrnoException,
  command: string
): string {
  if (error.code === "ENOENT") {
    return `Missing executable "${command}" (ENOENT).`;
  }
  const message = error.message || String(error);
  return `Failed to spawn Next: ${message}`;
}

function clearOwnedChild(child: ChildProcess): void {
  if (ownedChild === child) {
    ownedChild = null;
  }
}

function trackChild(
  child: ChildProcess,
  commandLabel: string,
  errorCommand: string
): void {
  ownedChild = child;
  pipeChildOutput(child);

  child.on("error", (error: NodeJS.ErrnoException) => {
    clearOwnedChild(child);
    console.error(`[next] ${spawnErrorReason(error, errorCommand)}`);
  });

  child.on("exit", (code, signal) => {
    clearOwnedChild(child);
    const detail =
      signal != null ? `signal ${signal}` : `code ${code ?? "unknown"}`;
    console.log(`[next] Process exited (${detail})`);
  });

  console.log(`[next] Spawned ${commandLabel} (pid ${child.pid})`);
}

function packagedNextEnv(appDir: string): NodeJS.ProcessEnv {
  const fromEnvFile = {
    ...loadEnvFile(path.join(appDir, ".env")),
    ...loadEnvFile(path.join(appDir, ".env.production")),
  };

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...fromEnvFile,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    PORT: portFromAppUrl(),
    // Next 16 standalone: HOSTNAME=127.0.0.1 breaks internal proxy → /api/health hangs.
    // Bind all interfaces; BrowserWindow still loads http://127.0.0.1:<port>.
    HOSTNAME: "0.0.0.0",
  };

  if (!env.DSH_CHAT_BRIDGE_URL?.trim()) {
    env.DSH_CHAT_BRIDGE_URL = DEFAULT_BRIDGE_URL;
  }

  return env;
}

/** Production standalone server from extraResources (packaged app). */
function startNextStandalone(appDir: string):
  | { ok: true; child: ChildProcess }
  | { ok: false; reason: string } {
  if (shuttingDown) {
    return {
      ok: false,
      reason: "Shutdown in progress; refusing to spawn Next",
    };
  }
  if (ownedChild) {
    return { ok: true, child: ownedChild };
  }

  const serverJs = path.join(appDir, "server.js");
  const electronBin = process.execPath;

  let child: ChildProcess;
  try {
    child = spawnExecutable(electronBin, [serverJs], {
      cwd: appDir,
      env: packagedNextEnv(appDir),
      stdio: ["ignore", "pipe", "pipe"],
      detached: shouldDetachChild(),
      windowsHide: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `Failed to spawn Next: ${message}` };
  }

  trackChild(child, `standalone server.js in ${appDir}`, electronBin);
  return { ok: true, child };
}

/** Dev: `npm run dev` in sibling bendo-app. */
function startNextDev(appDir: string):
  | { ok: true; child: ChildProcess }
  | { ok: false; reason: string } {
  if (shuttingDown) {
    return {
      ok: false,
      reason: "Shutdown in progress; refusing to spawn Next",
    };
  }
  if (ownedChild) {
    return { ok: true, child: ownedChild };
  }

  const npm = getNpmCommand();

  let child: ChildProcess;
  try {
    child = spawnCommand(npm, ["run", "dev"], {
      cwd: appDir,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
      detached: shouldDetachChild(),
      windowsHide: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `Failed to spawn Next: ${message}` };
  }

  trackChild(child, `\`npm run dev\` in ${appDir}`, npm);
  return { ok: true, child };
}

function startNext(appDir: string):
  | { ok: true; child: ChildProcess }
  | { ok: false; reason: string } {
  return app.isPackaged
    ? startNextStandalone(appDir)
    : startNextDev(appDir);
}

export function beginNextShutdown(): void {
  shuttingDown = true;
}

/** Tear down only the Next child this session spawned. */
export function stopSpawnedNext(): void {
  const child = ownedChild;
  if (!child) {
    return;
  }
  ownedChild = null;
  console.log("[next] Stopping spawned Next process…");
  killProcessTree(child);
}

/**
 * If Bendo is already up, attach. Otherwise spawn Next and wait for health.
 * Packaged → standalone server.js; dev → `npm run dev`.
 * Smoke mode never spawns.
 */
export async function ensureBendoServer(
  url: string
): Promise<EnsureBendoResult> {
  const healthUrl = getBendoHealthUrl();

  if (isSmokeMode()) {
    const check = await isHealthy(healthUrl);
    if (!check.ok) {
      return { ok: false, reason: check.reason };
    }
    return { ok: true, spawned: false };
  }

  const existing = await isHealthy(healthUrl);
  if (existing.ok) {
    console.log(
      `[next] Attaching to existing Bendo at ${url} (health ${healthUrl})`
    );
    return { ok: true, spawned: false };
  }

  const resolved = resolveBendoAppDir();
  if (!resolved.ok) {
    return resolved;
  }

  const started = startNext(resolved.dir);
  if (!started.ok) {
    return started;
  }

  const child = started.child;
  const timeoutMs = spawnTimeoutMs();
  console.log(
    `[next] Waiting for health ${healthUrl} (timeout ${timeoutMs}ms)…`
  );

  const exitedEarly = new Promise<EnsureBendoResult>((resolve) => {
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      const detail =
        signal != null ? `signal ${signal}` : `code ${code ?? "unknown"}`;
      resolve({
        ok: false,
        reason: `Next process exited before ready (${detail})`,
      });
    };
    child.once("exit", onExit);
  });

  const spawnFailed = new Promise<EnsureBendoResult>((resolve) => {
    child.once("error", (error: NodeJS.ErrnoException) => {
      resolve({
        ok: false,
        reason: spawnErrorReason(error, app.isPackaged ? "electron" : "npm"),
      });
    });
  });

  const waited = waitForHealthy(healthUrl, {
    timeoutMs,
    intervalMs: WAIT_INTERVAL_MS,
  });

  const result = await Promise.race([waited, exitedEarly, spawnFailed]);

  if (result.ok) {
    console.log(`[next] Bendo ready at ${url} (health ${healthUrl})`);
    return { ok: true, spawned: true };
  }

  stopSpawnedNext();
  return result;
}
