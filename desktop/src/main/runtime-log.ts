import fs from "node:fs";
import path from "node:path";
import { inspect } from "node:util";

import { app } from "electron";

let logFilePath: string | null = null;
let consolePatched = false;

function formatArg(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  return inspect(value, { depth: 4, breakLength: 120 });
}

function appendLine(line: string): void {
  if (!logFilePath) {
    return;
  }
  try {
    fs.appendFileSync(logFilePath, `${line}\n`, "utf8");
  } catch {
    // Avoid recursive console failures if the disk path becomes unwritable.
  }
}

const RUNTIME_LOG_NAME = "bendo-runtime.log";

/**
 * When the packaged `.app` lives under electron-builder's `release/` tree
 * (e.g. `desktop/release/mac-arm64/Bendo.app`), return that `release/` dir so
 * logs land next to the DMG — same file developers already open for `npm start`.
 */
function releaseDirBesidePackagedApp(): string | null {
  // execPath → …/release/mac-arm64/Bendo.app/Contents/MacOS/Bendo
  let dir = path.dirname(process.execPath);
  for (let i = 0; i < 10; i++) {
    if (path.basename(dir) === "release") {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

function canWriteFile(filePath: string): boolean {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.accessSync(path.dirname(filePath), fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Dev / unpackaged: `desktop/release/bendo-runtime.log`.
 * Packaged from `release/<arch>/Bendo.app`: same `release/bendo-runtime.log` when writable.
 * Installed app (`/Applications/…`): `userData/logs/bendo-runtime.log`.
 * Override: `BENDO_RUNTIME_LOG` (absolute or cwd-relative path).
 */
export function resolveRuntimeLogPath(): string {
  const fromEnv = process.env.BENDO_RUNTIME_LOG?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(process.cwd(), fromEnv);
  }

  if (!app.isPackaged) {
    return path.join(app.getAppPath(), "release", RUNTIME_LOG_NAME);
  }

  const releaseDir = releaseDirBesidePackagedApp();
  if (releaseDir) {
    const besideRelease = path.join(releaseDir, RUNTIME_LOG_NAME);
    if (canWriteFile(besideRelease)) {
      return besideRelease;
    }
  }

  return path.join(app.getPath("userData"), "logs", RUNTIME_LOG_NAME);
}

export function getRuntimeLogPath(): string | null {
  return logFilePath;
}

/**
 * Truncate (or create) one session note file and mirror console.* into it.
 * Call once early in app startup (after `app` is usable).
 */
export function initRuntimeLog(): string {
  const filePath = resolveRuntimeLogPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const header = [
    "--- Bendo desktop runtime log ---",
    `started: ${new Date().toISOString()}`,
    `packaged: ${String(app.isPackaged)}`,
    `file: ${filePath}`,
    "",
  ].join("\n");
  fs.writeFileSync(filePath, `${header}\n`, "utf8");
  logFilePath = filePath;

  if (!consolePatched) {
    patchConsoleToFile();
    consolePatched = true;
  }

  // Goes to terminal + file (patch already active).
  console.log(`[log] Runtime log → ${filePath}`);
  return filePath;
}

function patchConsoleToFile(): void {
  const levels = ["log", "info", "warn", "error", "debug"] as const;

  for (const level of levels) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      const text = args.map(formatArg).join(" ");
      appendLine(`${new Date().toISOString()} [${level}] ${text}`);
    };
  }
}
