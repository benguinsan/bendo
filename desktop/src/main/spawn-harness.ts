import type { ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { app } from "electron";

import {
  getPnpmCommand,
  killProcessTree,
  shouldDetachChild,
  spawnCommand,
  spawnExecutable,
} from "../platform/process";
import { isSmokeMode } from "./bendo-url";
import { applyBridgeCredentialsToEnv } from "./bridge-credentials";
import { isHealthy, waitForHealthy } from "./check-bendo";
import { getHarnessHealthUrl, getHarnessUrl } from "./harness-url";

const DEFAULT_SPAWN_TIMEOUT_MS = 90_000;
const WAIT_INTERVAL_MS = 500;
const DORO_PATCH = "./bendo-agent(doro)/cordis.yml";
const DSH_PNPM_ARGS = ["dsh", "web", "--patch", DORO_PATCH, "--no-open"] as const;
/** Packaged slim tree: built CLI (no system pnpm / tsx). */
const DSH_BIN_REL = path.join("apps", "cli", "lib", "bin.js");
const DSH_WEB_ARGS = ["web", "--patch", DORO_PATCH, "--no-open"] as const;
/**
 * dsh web boots cordis HMR, which needs Node's internal module loader
 * (`vendor/hmr` → `--expose-internals` / loader.internal).
 */
const ELECTRON_AS_NODE_EXEC_ARGV = ["--expose-internals"] as const;
/** Harness settings/credentials home under Electron userData (not ~/.dsh). */
const ELECTRON_DSH_HOME_DIRNAME = "dsh";

let ownedChild: ChildProcess | null = null;
/** Once true, `startHarness` refuses new spawns (quit / stopRuntimes). */
let shuttingDown = false;

export type EnsureHarnessResult =
  | { ok: true; spawned: boolean }
  | { ok: false; reason: string };

/** Health-wait timeout for harness spawn (env override or default). */
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
 * Find and validate the harness directory.
 * Env `BENDO_HARNESS_DIR` wins; packaged → `Resources/harness`;
 * unpackaged → sibling `../deepseek-harness`.
 */
export function resolveHarnessDir():
  | { ok: true; dir: string }
  | { ok: false; reason: string } {
  const raw = process.env.BENDO_HARNESS_DIR?.trim();
  let candidate: string;

  if (raw) {
    candidate = path.isAbsolute(raw)
      ? raw
      : path.resolve(process.cwd(), raw);
  } else if (app.isPackaged) {
    candidate = path.join(process.resourcesPath, "harness");
  } else {
    candidate = path.resolve(app.getAppPath(), "..", "deepseek-harness");
  }

  let st: fs.Stats;
  try {
    st = fs.statSync(candidate);
  } catch {
    return {
      ok: false,
      reason: app.isPackaged
        ? `Packaged harness not found: ${candidate} (run npm run build:harness before pack/dist)`
        : `deepseek-harness directory not found: ${candidate}`,
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

  if (app.isPackaged) {
    const dshBin = path.join(candidate, DSH_BIN_REL);
    if (!fs.existsSync(dshBin)) {
      return {
        ok: false,
        reason: `Packaged harness missing dsh bin: ${dshBin}`,
      };
    }
  }

  return { ok: true, dir: candidate };
}

/** Pipe harness child stdout/stderr lines into Electron console. */
function pipeChildOutput(child: ChildProcess): void {
  /** Forward one decoded chunk as `[harness]` log/error lines. */
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

/** Human-readable reason when spawning the harness child fails. */
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

/** Clear `ownedChild` when it matches the exited/errored process. */
function clearOwnedChild(child: ChildProcess): void {
  if (ownedChild === child) {
    ownedChild = null;
  }
}

/**
 * Expand a leading `~`, `~/`, or `~\` to `os.homedir()` (Node does not).
 * Named-user forms such as `~alice/...` are left unchanged.
 */
function expandLeadingTilde(input: string): string {
  if (input === "~") {
    return os.homedir();
  }
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

/**
 * Absolute path for the harness `$DSH_HOME` when Electron spawns dsh.
 *
 * Default: `{userData}/dsh` so settings.yaml / credentials stay app-local and
 * do not share `~/.dsh` with a Models-page / CLI session. Override with
 * `BENDO_DSH_HOME` (absolute, `~/…`, or cwd-relative). No auto-migrate from
 * `~/.dsh` — Save again in Bendo Agent after switching homes.
 */
export function resolveElectronDshHome(): string {
  const raw = process.env.BENDO_DSH_HOME?.trim();
  if (raw) {
    const expanded = expandLeadingTilde(raw);
    return path.isAbsolute(expanded)
      ? expanded
      : path.resolve(process.cwd(), expanded);
  }
  return path.join(app.getPath("userData"), ELECTRON_DSH_HOME_DIRNAME);
}

/** Ensure the Electron-managed DSH home directory exists before spawn. */
export function ensureElectronDshHome():
  | { ok: true; dir: string }
  | { ok: false; reason: string } {
  const dir = resolveElectronDshHome();
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      reason: `Failed to create DSH_HOME directory ${dir}: ${message}`,
    };
  }
  return { ok: true, dir };
}

/** Env for the harness child: Bendo URL, DSH_HOME, bridge secret, optional Electron-as-Node. */
function harnessChildEnv(
  bendoAppUrl: string,
  dshHome: string,
  options?: { electronAsNode?: boolean }
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (!env.BENDO_API_BASE_URL?.trim()) {
    env.BENDO_API_BASE_URL = bendoAppUrl;
  }
  // Force app-local harness data (settings.yaml, credentials) under userData.
  env.DSH_HOME = dshHome;
  if (options?.electronAsNode) {
    env.ELECTRON_RUN_AS_NODE = "1";
  }
  // Host IANA zone for dsh-time-context when cordis omits timeZone (Node honors TZ).
  if (!env.TZ?.trim()) {
    try {
      const hostZone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
      if (hostZone) {
        env.TZ = hostZone;
      }
    } catch {
      // Keep process default if Intl cannot resolve a zone.
    }
  }
  // Same secret as Next (env wins over cordis.yml). Force so Electron-managed
  // runs do not keep a stale cordis default when parent env is empty.
  applyBridgeCredentialsToEnv(env, { force: true });
  return env;
}

/** Own a spawned harness child: pipe logs, clear on exit/error, log spawn. */
function trackHarnessChild(
  child: ChildProcess,
  commandLabel: string,
  errorCommand: string,
  dshHomeDir: string
): void {
  ownedChild = child;
  pipeChildOutput(child);

  child.on("error", (error: NodeJS.ErrnoException) => {
    clearOwnedChild(child);
    console.error(`[harness] ${spawnErrorReason(error, errorCommand)}`);
  });

  child.on("exit", (code, signal) => {
    clearOwnedChild(child);
    const detail =
      signal != null ? `signal ${signal}` : `code ${code ?? "unknown"}`;
    console.log(`[harness] Process exited (${detail})`);
  });

  console.log(
    `[harness] Spawned ${commandLabel} (pid ${child.pid}; DSH_HOME=${dshHomeDir})`
  );
}

/** Packaged slim harness: Electron-as-Node → apps/cli/lib/bin.js (no system pnpm). */
function startHarnessPackaged(
  harnessDir: string,
  bendoAppUrl: string,
  dshHomeDir: string
):
  | { ok: true; child: ChildProcess }
  | { ok: false; reason: string } {
  const dshBin = path.join(harnessDir, DSH_BIN_REL);
  const electronBin = process.execPath;

  let child: ChildProcess;
  try {
    child = spawnExecutable(
      electronBin,
      [...ELECTRON_AS_NODE_EXEC_ARGV, dshBin, ...DSH_WEB_ARGS],
      {
        cwd: harnessDir,
        env: harnessChildEnv(bendoAppUrl, dshHomeDir, { electronAsNode: true }),
        stdio: ["ignore", "pipe", "pipe"],
        detached: shouldDetachChild(),
        windowsHide: true,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `Failed to spawn harness: ${message}` };
  }

  trackHarnessChild(
    child,
    `\`electron-as-node ${ELECTRON_AS_NODE_EXEC_ARGV.join(" ")} ${DSH_BIN_REL} ${DSH_WEB_ARGS.join(" ")}\` in ${harnessDir}`,
    "electron",
    dshHomeDir
  );
  return { ok: true, child };
}

/** Dev / unpackaged: `pnpm dsh web --patch …` in sibling (or BENDO_HARNESS_DIR). */
function startHarnessDev(
  harnessDir: string,
  bendoAppUrl: string,
  dshHomeDir: string
):
  | { ok: true; child: ChildProcess }
  | { ok: false; reason: string } {
  const pnpm = getPnpmCommand();

  let child: ChildProcess;
  try {
    child = spawnCommand(pnpm, DSH_PNPM_ARGS, {
      cwd: harnessDir,
      env: harnessChildEnv(bendoAppUrl, dshHomeDir),
      stdio: ["ignore", "pipe", "pipe"],
      detached: shouldDetachChild(),
      windowsHide: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `Failed to spawn harness: ${message}` };
  }

  trackHarnessChild(
    child,
    `\`pnpm ${DSH_PNPM_ARGS.join(" ")}\` in ${harnessDir}`,
    pnpm,
    dshHomeDir
  );
  return { ok: true, child };
}

/** Spawn packaged or dev harness unless already owned or shutting down. */
function startHarness(
  harnessDir: string,
  bendoAppUrl: string
):
  | { ok: true; child: ChildProcess }
  | { ok: false; reason: string } {
  // Check flag shuttingDown first child kill -> prevent new spawns (startup, reload, active) after shutdown.
  if (shuttingDown) {
    return {
      ok: false,
      reason: "Shutdown in progress; refusing to spawn harness",
    };
  }
  // Check if the harness child process is already running.
  if (ownedChild) {
    return { ok: true, child: ownedChild };
  }

  const dshHome = ensureElectronDshHome();
  if (!dshHome.ok) {
    return dshHome;
  }

  return app.isPackaged
    ? startHarnessPackaged(harnessDir, bendoAppUrl, dshHome.dir)
    : startHarnessDev(harnessDir, bendoAppUrl, dshHome.dir);
}

/** Mark harness subsystem shutting down so new spawns are refused. */
export function beginHarnessShutdown(): void {
  shuttingDown = true;
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
      `[harness] Attaching to existing harness at ${url} (health ${healthUrl}); DSH_HOME is that process's own home (Electron userData/dsh only applies when this app spawns harness)`
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
  const errorCommand = app.isPackaged ? "electron" : getPnpmCommand();
  const timeoutMs = spawnTimeoutMs();
  console.log(
    `[harness] Waiting for health ${healthUrl} (timeout ${timeoutMs}ms)…`
  );

  const exitedEarly = new Promise<EnsureHarnessResult>((resolve) => {
    /** Resolve ensureHarness as failed if the child exits before health is ready. */
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
      resolve({ ok: false, reason: spawnErrorReason(error, errorCommand) });
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
