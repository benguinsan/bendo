#!/usr/bin/env node
/**
 * CI check for Windows unpacked harness after electron-builder:
 * zero symlinks + harness-links.json, restore junctions, smoke boot.
 *
 * Usage (from desktop/):
 *   node scripts/verify-win-unpacked-harness.mjs [harnessDir]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { smokeBoot } from "./lib/harness-smoke.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.join(__dirname, "..");
const require = createRequire(import.meta.url);

function fail(message) {
  console.error(`[verify-win-harness] ${message}`);
  process.exit(1);
}

/** @param {string} root */
function countSymlinks(root) {
  let count = 0;
  let files = 0;
  /** @param {string} dir */
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isSymbolicLink()) {
        count += 1;
        continue;
      }
      if (ent.isDirectory()) {
        walk(full);
      } else {
        files += 1;
      }
    }
  };
  walk(root);
  return { symlinks: count, files };
}

/** @param {string} dir */
function dirSizeBytes(dir) {
  const du = spawnSync("du", ["-sk", dir], { encoding: "utf8" });
  if (du.status !== 0) {
    return null;
  }
  const kb = Number((du.stdout || "").trim().split(/\s+/u)[0]);
  if (!Number.isFinite(kb)) {
    return null;
  }
  return kb * 1024;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "unknown";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const harnessDir = path.resolve(
  process.argv[2] ??
    path.join(desktopRoot, "release", "win-unpacked", "resources", "harness")
);

if (!fs.existsSync(harnessDir)) {
  fail(`Harness dir missing: ${harnessDir}`);
}

const { symlinks, files } = countSymlinks(harnessDir);
if (symlinks !== 0) {
  fail(`Expected 0 symlinks in unpacked harness, found ${symlinks}`);
}

const manifestPath = path.join(harnessDir, "harness-links.json");
if (!fs.existsSync(manifestPath)) {
  fail(`Missing harness-links.json at ${manifestPath}`);
}

const linksModulePath = path.join(desktopRoot, "dist", "main", "harness-links.js");
if (!fs.existsSync(linksModulePath)) {
  fail(
    `Missing compiled ${linksModulePath} (dist:win must run npm run build first)`
  );
}

const { restoreHarnessLinks } = require(linksModulePath);
const restored = restoreHarnessLinks(harnessDir);
if (!restored.ok) {
  fail(`restoreHarnessLinks failed: ${restored.reason}`);
}
if (!(restored.created > 0)) {
  fail(`Expected restore created > 0, got ${restored.created}`);
}
console.log(
  `[verify-win-harness] Restored ${restored.created} junctions from harness-links.json`
);

let electronBin;
try {
  const electronPkgJson = require.resolve("electron/package.json", {
    paths: [desktopRoot],
  });
  electronBin = createRequire(electronPkgJson)("electron");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`Cannot resolve Electron binary: ${message}`);
}
if (typeof electronBin !== "string" || !fs.existsSync(electronBin)) {
  fail(`Electron binary missing at ${String(electronBin)}`);
}

const smoke = await smokeBoot(harnessDir, electronBin);
if (!smoke.ok) {
  fail(`Smoke boot failed: ${smoke.reason}`);
}
if (smoke.skipped) {
  fail("Smoke was skipped (BENDO_HARNESS_SKIP_SMOKE); refuse in CI verify");
}

const size = dirSizeBytes(harnessDir);
console.log(
  `[verify-win-harness] OK — size=${size == null ? "unknown" : formatBytes(size)} files≈${files} (non-dir entries; links excluded)`
);
