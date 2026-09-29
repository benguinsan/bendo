#!/usr/bin/env node
/**
 * Build bendo-app (Next standalone) and sync into desktop/resources/bendo-app
 * for electron-builder extraResources.
 *
 * Usage (from desktop/):
 *   npm run build:bendo
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.join(__dirname, "..");
const bendoAppRoot = path.resolve(desktopRoot, "..", "bendo-app");
const outDir = path.join(desktopRoot, "resources", "bendo-app");

function fail(message) {
  console.error(`[build:bendo] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(bendoAppRoot, "package.json"))) {
  fail(`bendo-app not found at ${bendoAppRoot}`);
}

console.log(`[build:bendo] Building Next standalone in ${bendoAppRoot}…`);
const build = spawnSync("npm", ["run", "build"], {
  cwd: bendoAppRoot,
  env: {
    ...process.env,
    BENDO_DESKTOP_BUILD: "1",
  },
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (build.status !== 0) {
  fail(`next build failed (exit ${build.status ?? "unknown"})`);
}

const standaloneRoot = path.join(bendoAppRoot, ".next", "standalone");
if (!fs.existsSync(standaloneRoot)) {
  fail(`Missing standalone output: ${standaloneRoot}`);
}

// Next may nest the app under a package folder inside standalone.
let serverDir = standaloneRoot;
const nestedServer = path.join(standaloneRoot, "bendo-app", "server.js");
const rootServer = path.join(standaloneRoot, "server.js");
if (fs.existsSync(nestedServer)) {
  serverDir = path.join(standaloneRoot, "bendo-app");
} else if (!fs.existsSync(rootServer)) {
  // Try package name from package.json
  const pkg = JSON.parse(
    fs.readFileSync(path.join(bendoAppRoot, "package.json"), "utf8")
  );
  const byName = path.join(standaloneRoot, pkg.name ?? "", "server.js");
  if (fs.existsSync(byName)) {
    serverDir = path.dirname(byName);
  } else {
    fail(`Could not find server.js under ${standaloneRoot}`);
  }
}

console.log(`[build:bendo] Using standalone server dir: ${serverDir}`);

// Defense in depth: strip env from standalone source before syncing resources.
const envNames = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
];
for (const dir of new Set([standaloneRoot, serverDir])) {
  for (const name of envNames) {
    const baked = path.join(dir, name);
    if (fs.existsSync(baked)) {
      fs.rmSync(baked, { force: true });
      console.log(
        `[build:bendo] Removed ${name} from ${path.relative(bendoAppRoot, dir)}`
      );
    }
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(outDir), { recursive: true });
fs.cpSync(serverDir, outDir, { recursive: true });

// Standalone requires static assets alongside the server.
const staticSrc = path.join(bendoAppRoot, ".next", "static");
const staticDest = path.join(outDir, ".next", "static");
if (!fs.existsSync(staticSrc)) {
  fail(`Missing .next/static at ${staticSrc}`);
}
fs.mkdirSync(path.dirname(staticDest), { recursive: true });
fs.cpSync(staticSrc, staticDest, { recursive: true });

const publicSrc = path.join(bendoAppRoot, "public");
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, path.join(outDir, "public"), { recursive: true });
}

// Never bake secrets into installer resources (in case any .env* reappears).
for (const name of envNames) {
  const baked = path.join(outDir, name);
  if (fs.existsSync(baked)) {
    fs.rmSync(baked, { force: true });
    console.log(`[build:bendo] Removed ${name} from resources`);
  }
}

if (!fs.existsSync(path.join(outDir, "server.js"))) {
  fail(`server.js missing after sync: ${outDir}`);
}

console.log(`[build:bendo] Ready at ${outDir}`);
