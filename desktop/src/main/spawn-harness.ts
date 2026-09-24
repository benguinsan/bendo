import type { ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

import {
  getPnpmCommand,
  killProcessTree,
  shouldDetachChild,
  spawnCommand,
} from "../platform/process";
import { isSmokeMode } from "./bendo-url";
import { isHealthy, waitForHealthy } from "./check-bendo";
import { getHarnessHealthUrl, getHarnessUrl } from "./harness-url";

const DEFAULT_SPAWN_TIMEOUT_MS = 90_000;
const WAIT_INTERVAL_MS = 500;
const DORO_PATCH = "./bendo-agent(doro)/cordis.yml";
const DSH_ARGS = ["dsh", "web", "--patch", DORO_PATCH, "--no-open"] as const;

let ownedChild: ChildProcess | null = null;

export type EnsureHarnessResult =
  | { ok: true; spawned: boolean }
  | { ok: false; reason: string };

function spawnTimeoutMs(): number {
  const raw = process.env.BENDO_HARNESS_SPAWN_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_SPAWN_TIMEOUT_MS;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    console.warn(
      `[harness] Invalid BENDO_HARNESS_SPAWN_TIMEOUT_MS="${raw}"; using ${DEFAULT_SPAWN_TIMEOUT_MS}`
    );
    return DEFAULT_SPAWN_TIMEOUT_MS;
  }
  return n;
}

/**
 * Find and validate the harness directory: `BENDO_HARNESS_DIR` or sibling
 * `../deepseek-harness` relative to the desktop package root.
 */
export function resolveHarnessDir():
  | { ok: true; dir: string }
  | { ok: false; reason: string } {
  const raw = process.env.BENDO_HARNESS_DIR?.trim();
  const desktopRoot = app.getAppPath();
  const candidate = raw
    ? path.isAbsolute(raw)
      ? raw
      : path.resolve(process.cwd(), raw)
    : path.resolve(desktopRoot, "..", "deepseek-harness");

  let st: fs.Stats;
  try {
    st = fs.statSync(candidate);
  } catch {
    return {
      ok: false,
      reason: `deepseek-harness directory not found: ${candidate}`,
    };
  }

  if (!st.isDirectory()) {
    return {
      ok: false,
      reason: `BENDO_HARNESS_DIR is not a directory: ${candidate}`,
    };
  }

  const packageJson = path.join(candidate, "package.json");
  if (!fs.existsSync(packageJson)) {
    return {
      ok: false,
      reason: `Missing package.json in ${candidate}`,
    };
  }

  const cordis = path.join(candidate, "bendo-agent(doro)", "cordis.yml");
  if (!fs.existsSync(cordis)) {
    return {
      ok: false,
      reason: `Missing Doro overlay cordis.yml: ${cordis}`,
    };
  }

  return { ok: true, dir: candidate };
}

// Log the output of the harness child process to the console.
function pipeChildOutput(child: ChildProcess): void {
  const forward = (text: string, stream: "stdout" | "stderr") => {
    for (const line of text.split(/\r?\n/)) {
      if (!line) {
        continue;
      }
      if (stream === "stderr") {
        console.error(`[harness] ${line}`);
      } else {
        console.log(`[harness] ${line}`);
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

// Spawn error reason message.
function spawnErrorReason(
  error: NodeJS.ErrnoException,
  pnpmCommand: string
): string {
  if (error.code === "ENOENT") {
    return `Missing executable "${pnpmCommand}" (ENOENT). Is pnpm on PATH?`;
  }
  const message = error.message || String(error);
  return `Failed to spawn harness: ${message}`;
}

function clearOwnedChild(child: ChildProcess): void {
  if (ownedChild === child) {
    ownedChild = null;
  }
}

// Set the environment variables for the harness child process.
function harnessChildEnv(bendoAppUrl: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (!env.BENDO_API_BASE_URL?.trim()) {
    env.BENDO_API_BASE_URL = bendoAppUrl;
  }
  return env;
}

function startHarness(
  harnessDir: string,
  bendoAppUrl: string
):
  | { ok: true; child: ChildProcess }
  | { ok: false; reason: string } {
  if (ownedChild) {
    return { ok: true, child: ownedChild };
  }

  const pnpm = getPnpmCommand();

  let child: ChildProcess;
  try {
    child = spawnCommand(pnpm, DSH_ARGS, {
      cwd: harnessDir,
      env: harnessChildEnv(bendoAppUrl),
      stdio: ["ignore", "pipe", "pipe"],
      detached: shouldDetachChild(),
      windowsHide: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `Failed to spawn harness: ${message}` };
  }

  ownedChild = child;
  pipeChildOutput(child);

  child.on("error", (error: NodeJS.ErrnoException) => {
    clearOwnedChild(child);
    console.error(`[harness] ${spawnErrorReason(error, pnpm)}`);
  });

  child.on("exit", (code, signal) => {
    clearOwnedChild(child);
    const detail =
      signal != null ? `signal ${signal}` : `code ${code ?? "unknown"}`;
    console.log(`[harness] Process exited (${detail})`);
  });

  console.log(
    `[harness] Spawned \`pnpm ${DSH_ARGS.join(" ")}\` in ${harnessDir} (pid ${child.pid})`
  );
  return { ok: true, child };
}

/** Tear down only the harness child this session spawned. */
export function stopSpawnedHarness(): void {
  const child = ownedChild;
  if (!child) {
    return;
  }
  ownedChild = null;
  console.log("[harness] Stopping spawned harness process…");
  killProcessTree(child);
}

/**
 * If harness is already up, attach. Otherwise spawn local dsh web + Doro patch and wait.
 * Smoke mode never spawns. Failures are soft (caller may still load Bendo).
 * Readiness = 2xx on bridge health URL (`/bendo-chat` GET by default).
 */
export async function ensureHarnessServer(
  bendoAppUrl: string
): Promise<EnsureHarnessResult> {
  const url = getHarnessUrl();
  const healthUrl = getHarnessHealthUrl();

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
      `[harness] Attaching to existing harness at ${url} (health ${healthUrl})`
    );
    return { ok: true, spawned: false };
  }

  const resolved = resolveHarnessDir();
  if (!resolved.ok) {
    return resolved;
  }

  const started = startHarness(resolved.dir, bendoAppUrl);
  if (!started.ok) {
    return started;
  }

  const child = started.child;
  const pnpm = getPnpmCommand();
  const timeoutMs = spawnTimeoutMs();
  console.log(
    `[harness] Waiting for health ${healthUrl} (timeout ${timeoutMs}ms)…`
  );

  const exitedEarly = new Promise<EnsureHarnessResult>((resolve) => {
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      const detail =
        signal != null ? `signal ${signal}` : `code ${code ?? "unknown"}`;
      resolve({
        ok: false,
        reason: `Harness process exited before ready (${detail})`,
      });
    };
    child.once("exit", onExit);
  });

  const spawnFailed = new Promise<EnsureHarnessResult>((resolve) => {
    child.once("error", (error: NodeJS.ErrnoException) => {
      resolve({ ok: false, reason: spawnErrorReason(error, pnpm) });
    });
  });

  const waited = waitForHealthy(healthUrl, {
    timeoutMs,
    intervalMs: WAIT_INTERVAL_MS,
  });

  const result = await Promise.race([waited, exitedEarly, spawnFailed]);

  if (result.ok) {
    console.log(`[harness] Ready at ${url} (health ${healthUrl})`);
    return { ok: true, spawned: true };
  }

  stopSpawnedHarness();
  return result;
}
