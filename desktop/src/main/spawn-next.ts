import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

import {
  getNpmCommand,
  killProcessTree,
  shouldDetachChild,
} from "../platform/process";
import { isSmokeMode } from "./bendo-url";
import { isBendoReachable, waitForBendo } from "./check-bendo";

const DEFAULT_SPAWN_TIMEOUT_MS = 60_000;
const WAIT_INTERVAL_MS = 500;

let ownedChild: ChildProcess | null = null;

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

/**
 * Resolve the Next app directory: `BENDO_APP_DIR` or sibling `../bendo-app`
 * relative to the desktop package root.
 */
export function resolveBendoAppDir():
  | { ok: true; dir: string }
  | { ok: false; reason: string } {
  const raw = process.env.BENDO_APP_DIR?.trim();
  const desktopRoot = app.getAppPath();
  const candidate = raw
    ? path.isAbsolute(raw)
      ? raw
      : path.resolve(process.cwd(), raw)
    : path.resolve(desktopRoot, "..", "bendo-app");

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

  const packageJson = path.join(candidate, "package.json");
  if (!fs.existsSync(packageJson)) {
    return {
      ok: false,
      reason: `Missing package.json in ${candidate}`,
    };
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

  // Next prints normal text logs. Tell Node to decode stdout/stderr as UTF-8
  // *before* we listen, so each "data" event gives us a string we can print.
  // If we skip this, Node gives raw bytes (Buffer) instead.
  if (child.stdout) {
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => forward(chunk, "stdout"));
  }
  if (child.stderr) {
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => forward(chunk, "stderr"));
  }
}

/**
 * Format child "error" into an offline reason.
 * Missing `npm` is ENOENT — spawn() does not throw for that; it emits "error" later.
 */
function spawnErrorReason(
  error: NodeJS.ErrnoException,
  npmCommand: string
): string {
  if (error.code === "ENOENT") {
    return `Missing executable "${npmCommand}" (ENOENT). Is Node.js/npm on PATH?`;
  }
  const message = error.message || String(error);
  return `Failed to spawn Next: ${message}`;
}

function clearOwnedChild(child: ChildProcess): void {
  if (ownedChild === child) {
    ownedChild = null;
  }
}

function startNextDev(appDir: string):
  | { ok: true; child: ChildProcess }
  | { ok: false; reason: string } {
  if (ownedChild) {
    return { ok: true, child: ownedChild };
  }

  const npm = getNpmCommand();

  let child: ChildProcess;
  try {
    child = spawn(npm, ["run", "dev"], {
      cwd: appDir,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      detached: shouldDetachChild(),
      windowsHide: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `Failed to spawn Next: ${message}` };
  }

  ownedChild = child;
  pipeChildOutput(child);

  // spawn() returns immediately even when the binary is missing. That failure
  // arrives here as "error" (often ENOENT), not as a throw in the try/catch above.
  // Clear ownedChild so we do not try to tear down a process that never started.
  child.on("error", (error: NodeJS.ErrnoException) => {
    clearOwnedChild(child);
    console.error(`[next] ${spawnErrorReason(error, npm)}`);
  });

  child.on("exit", (code, signal) => {
    clearOwnedChild(child);
    const detail =
      signal != null ? `signal ${signal}` : `code ${code ?? "unknown"}`;
    console.log(`[next] Process exited (${detail})`);
  });

  console.log(`[next] Spawned \`npm run dev\` in ${appDir} (pid ${child.pid})`);
  return { ok: true, child };
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
 * If Bendo is already up, attach. Otherwise spawn local `npm run dev` and wait.
 * Smoke mode never spawns.
 */
export async function ensureBendoServer(
  url: string
): Promise<EnsureBendoResult> {
  if (isSmokeMode()) {
    const check = await isBendoReachable(url);
    if (!check.ok) {
      return { ok: false, reason: check.reason };
    }
    return { ok: true, spawned: false };
  }

  const existing = await isBendoReachable(url);
  if (existing.ok) {
    console.log(`[next] Attaching to existing Bendo at ${url}`);
    return { ok: true, spawned: false };
  }

  const resolved = resolveBendoAppDir();
  if (!resolved.ok) {
    return resolved;
  }

  const started = startNextDev(resolved.dir);
  if (!started.ok) {
    return started;
  }

  const child = started.child;
  const npm = getNpmCommand();
  const timeoutMs = spawnTimeoutMs();
  console.log(
    `[next] Waiting for ${url} (timeout ${timeoutMs}ms)…`
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

  // Same async launch failure as above — surface it as offline instead of hanging
  // on the HTTP wait (or risking an uncaught "error" with no listener here).
  const spawnFailed = new Promise<EnsureBendoResult>((resolve) => {
    child.once("error", (error: NodeJS.ErrnoException) => {
      resolve({ ok: false, reason: spawnErrorReason(error, npm) });
    });
  });

  const waited = waitForBendo(url, {
    timeoutMs,
    intervalMs: WAIT_INTERVAL_MS,
  });

  const result = await Promise.race([waited, exitedEarly, spawnFailed]);

  if (result.ok) {
    console.log(`[next] Bendo ready at ${url}`);
    return { ok: true, spawned: true };
  }

  stopSpawnedNext();
  return result;
}
