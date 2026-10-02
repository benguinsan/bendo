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

/**
 * Dev / unpackaged: `desktop/release/bendo-runtime.log` (electron-builder output dir).
 * Packaged: `userData/logs/bendo-runtime.log` (app bundle / release tree is often read-only).
 */
export function resolveRuntimeLogPath(): string {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), "release", "bendo-runtime.log");
  }
  return path.join(app.getPath("userData"), "logs", "bendo-runtime.log");
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
