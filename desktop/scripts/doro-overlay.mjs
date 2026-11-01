#!/usr/bin/env node
/**
 * Keep the Doro overlay copies in sync.
 *   check: fail if `deepseek-harness/bendo-agent(doro)/` differs from `packaging/bendo-agent(doro)/`
 *          (skips when the harness overlay is absent, e.g. CI before inject).
 *   sync:  copy the harness (dogfood) overlay over the tracked packaging snapshot.
 * Harness dir: `BENDO_HARNESS_DIR` or `../deepseek-harness` (same as build:harness).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OVERLAY = "bendo-agent(doro)";
// tsconfig.json only typechecks the overlay inside the harness (paths like ../vendor/cordis
// resolve there, not under desktop/packaging), so the snapshot does not carry it.
const IGNORED = new Set(["tsconfig.json"]);
// Finder metadata can appear in any folder; never compare or copy it.
const isIgnored = (rel) => IGNORED.has(rel) || path.basename(rel) === ".DS_Store";
const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const harnessRoot = process.env.BENDO_HARNESS_DIR?.trim()
  ? path.resolve(process.env.BENDO_HARNESS_DIR.trim())
  : path.resolve(desktopRoot, "..", "deepseek-harness");
const devDir = path.join(harnessRoot, OVERLAY);
const snapshotDir = path.join(desktopRoot, "packaging", OVERLAY);

/** Relative file paths under `dir`, sorted. */
function listFiles(dir, prefix = "") {
  return fs
    .readdirSync(path.join(dir, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const rel = path.join(prefix, entry.name);
      if (isIgnored(rel)) return [];
      return entry.isDirectory() ? listFiles(dir, rel) : [rel];
    })
    .sort();
}

/** Paths that are missing on one side or differ in content. */
function diffDirs(a, b) {
  const aFiles = listFiles(a);
  const bFiles = listFiles(b);
  const all = [...new Set([...aFiles, ...bFiles])].sort();
  return all.filter((rel) => {
    const pa = path.join(a, rel);
    const pb = path.join(b, rel);
    if (!fs.existsSync(pa) || !fs.existsSync(pb)) return true;
    return !fs.readFileSync(pa).equals(fs.readFileSync(pb));
  });
}

function check() {
  if (!fs.existsSync(devDir)) {
    console.log(`[doro:check] skip: no harness overlay at ${devDir}`);
    return 0;
  }
  const diffs = diffDirs(devDir, snapshotDir);
  if (diffs.length === 0) {
    console.log("[doro:check] harness overlay matches packaging snapshot");
    return 0;
  }
  console.error("[doro:check] Doro overlay drift (harness vs desktop/packaging):");
  for (const rel of diffs) console.error(`  ${rel}`);
  console.error("[doro:check] Run `npm run doro:sync` after testing the harness copy, then commit.");
  return 1;
}

function sync() {
  if (!fs.existsSync(path.join(devDir, "cordis.yml"))) {
    console.error(`[doro:sync] missing ${path.join(devDir, "cordis.yml")}`);
    return 1;
  }
  // Snapshot is tracked in git, so replacing it wholesale is recoverable.
  fs.rmSync(snapshotDir, { recursive: true, force: true });
  fs.cpSync(devDir, snapshotDir, {
    recursive: true,
    filter: (src) => !isIgnored(path.relative(devDir, src)),
  });
  console.log(`[doro:sync] copied ${devDir} -> ${snapshotDir}`);
  return check();
}

const mode = process.argv[2];
if (mode === "check") process.exit(check());
if (mode === "sync") process.exit(sync());
console.error("usage: node scripts/doro-overlay.mjs <check|sync>");
process.exit(2);
