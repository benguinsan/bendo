import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

const PLACEHOLDER_MARKERS = ["/absolute/path/to/", "path/to/"];

/**
 * Load KEY=VALUE lines into process.env when the key is unset.
 * Does not override existing env (shell / launcher wins).
 */
export function applyEnvFile(filePath: string): void {
  let text: string;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) {
      continue;
    }
    if (process.env[key] !== undefined) {
      continue;
    }
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (isPlaceholderValue(value)) {
      continue;
    }
    process.env[key] = value;
  }
}

function isPlaceholderValue(value: string): boolean {
  return PLACEHOLDER_MARKERS.some((marker) => value.includes(marker));
}

/**
 * Dev: `desktop/.env`. Packaged: optional `userData/desktop.env` (public URL etc.).
 * Never bake secrets into the installer; userData / local .env is machine-local.
 */
export function loadDesktopEnv(): void {
  if (!app.isPackaged) {
    applyEnvFile(path.join(app.getAppPath(), ".env"));
    return;
  }
  applyEnvFile(path.join(app.getPath("userData"), "desktop.env"));
}
