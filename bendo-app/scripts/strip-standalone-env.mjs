/**
 * Strip env files from Next standalone output after `next build`.
 *
 * Next may copy `.env*` into `.next/standalone` for convenience; we never want
 * secrets in that tree (Docker image layers, desktop resources, local artifacts).
 * Runtime credentials come from the process environment (Compose, Vercel, Electron).
 */
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const standaloneRoot = path.join(root, ".next", "standalone");

const ENV_NAMES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
];

function stripEnvFiles(dir) {
  if (!fs.existsSync(dir)) {
    return 0;
  }
  let removed = 0;
  for (const name of ENV_NAMES) {
    const target = path.join(dir, name);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
      removed += 1;
      console.log(`[strip-standalone-env] Removed ${path.relative(root, target)}`);
    }
  }
  return removed;
}

if (!fs.existsSync(standaloneRoot)) {
  console.log("[strip-standalone-env] No standalone output; skip");
  process.exit(0);
}

let total = stripEnvFiles(standaloneRoot);

try {
  for (const entry of fs.readdirSync(standaloneRoot, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      entry.name !== "node_modules" &&
      entry.name !== ".next"
    ) {
      total += stripEnvFiles(path.join(standaloneRoot, entry.name));
    }
  }
} catch {
  // ignore
}

if (total === 0) {
  console.log("[strip-standalone-env] No .env* files found under standalone");
}
