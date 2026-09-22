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
  const forward = (chunk: Buffer, stream: "stdout" | "stderr") => {
    const text = chunk.toString("utf8");
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

  child.stdout?.on("data", (chunk: Buffer) => forward(chunk, "stdout"));
  child.stderr?.on("data", (chunk: Buffer) => forward(chunk, "stderr"));
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

  child.on("exit", (code, signal) => {
    if (ownedChild === child) {
      ownedChild = null;
    }
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

  const waited = waitForBendo(url, {
    timeoutMs,
    intervalMs: WAIT_INTERVAL_MS,
  });

  const result = await Promise.race([waited, exitedEarly]);

  if (result.ok) {
    console.log(`[next] Bendo ready at ${url}`);
    return { ok: true, spawned: true };
  }

  stopSpawnedNext();
  return result;
}
