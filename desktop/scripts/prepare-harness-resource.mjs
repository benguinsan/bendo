#!/usr/bin/env node
/**
 * Copy a pruned DeepSeek Harness tree into desktop/resources/harness for
 * electron-builder extraResources.
 *
 * v1: denylist rsync (docs/tests/python/…).
 * Phase 2: hoist @deepseek-ai + prune bulk/tooling .pnpm; keep MCP on disk.
 * Phase 3: stub dsh web UI dist (keep package + index.html), drop client src,
 * prune more UI/build .pnpm. Smoke-boot the result.
 *
 * Usage (from desktop/):
 *   npm run build:harness
 *
 * Override source:
 *   BENDO_HARNESS_DIR=/path/to/deepseek-harness npm run build:harness
 *
 * Skip smoke (faster iterate):
 *   BENDO_HARNESS_SKIP_SMOKE=1 npm run build:harness
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.join(__dirname, "..");
const defaultHarnessRoot = path.resolve(desktopRoot, "..", "deepseek-harness");
const outDir = path.join(desktopRoot, "resources", "harness");
const DORO_CORDIS = path.join("bendo-agent(doro)", "cordis.yml");
const DORO_PATCH = "./bendo-agent(doro)/cordis.yml";
const DSH_BIN_REL = path.join("apps", "cli", "lib", "bin.js");
/** Alternate port so prepare smoke does not collide with a running :3080 harness. */
const SMOKE_PORT = 13_080;
const SMOKE_HEALTH_URL = `http://127.0.0.1:${SMOKE_PORT}/bendo-chat`;
const SMOKE_TIMEOUT_MS = 90_000;
const SMOKE_POLL_MS = 500;

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

/** Top-level / path prefixes to drop (rsync --exclude). */
const RSYNC_EXCLUDES = [
  ".git/",
  ".github/",
  ".DS_Store",
  "docs/",
  "website/",
  "python/",
  "snapshots/",
  "lefthook.yml",
  "pytest.ini",
  "vitest.config.ts",
  "vitest.e2e.config.ts",
  "vitest.expected.config.ts",
  "vitest.shared.ts",
  "vitest.snapshot.config.ts",
  "vitest.web-stress.config.ts",
  "vitest.web.config.ts",
  "vitest.web.perf.config.ts",
  "tsconfig.client.tsbuildinfo",
  "tsconfig.host.tsbuildinfo",
  // Root brand / contributor docs (keep LICENSE + THIRD_PARTY_NOTICES).
  "AGENTS.md",
  "BENCHMARK.md",
  "BRAND_GUIDELINES.md",
  "BRAND_GUIDELINES.zh.md",
  "BRAND_GUIDELINES.i18n.yaml",
  "CLAUDE.md",
  "CONTRIBUTING.md",
  "CONTRIBUTING.zh.md",
  "CONTRIBUTING.i18n.yaml",
  "README.md",
  "README.zh.md",
  "README.i18n.yaml",
  "SAFETY.md",
  "SAFETY.zh.md",
  "SAFETY.i18n.yaml",
  // Dev / test bulk under packages & apps (runtime uses built lib + packages).
  "apps/cli/src/",
  "apps/cli/tests/",
  "apps/web/src/",
  "apps/web/tests/",
  "apps/web/stress-tests/",
  "scripts/",
  // Phase 2: test-only package tree (keep experimental/e2b — CLI workspace links).
  "packages/test-support/",
  // Phase 3: browser UI source (runtime uses packages/client/*/lib).
  "packages/client/**/src/",
  "packages/client/**/tests/",
  // Cheap global noise.
  "**/.DS_Store",
  "**/.idea/",
  "**/*.tsbuildinfo",
  "**/*.map",
  "**/__tests__/",
  "**/*.test.ts",
  "**/*.test.js",
  "**/*.test.mjs",
  "**/*.spec.ts",
  "**/*.spec.js",
  ...ENV_NAMES,
];

if (process.platform === "darwin") {
  RSYNC_EXCLUDES.push(
    "native/landlock-run/packages/linux-arm64/",
    "native/landlock-run/packages/linux-x64/",
    "native/landlock-run/packages/win32-x64/",
    "native/landlock-run/packages/win32-arm64/"
  );
} else if (process.platform === "linux") {
  RSYNC_EXCLUDES.push(
    "native/landlock-run/packages/darwin-arm64/",
    "native/landlock-run/packages/darwin-x64/",
    "native/landlock-run/packages/win32-x64/",
    "native/landlock-run/packages/win32-arm64/"
  );
} else if (process.platform === "win32") {
  RSYNC_EXCLUDES.push(
    "native/landlock-run/packages/darwin-arm64/",
    "native/landlock-run/packages/darwin-x64/",
    "native/landlock-run/packages/linux-arm64/",
    "native/landlock-run/packages/linux-x64/"
  );
}

/**
 * Hoist `@deepseek-ai/*` into root `node_modules/@deepseek-ai/` so Doro overlay
 * ESM imports resolve under plain Node / Electron-as-Node (pnpm+tsx differs).
 * Prefer `.pnpm/node_modules/@deepseek-ai` (full transitive set), then fill gaps
 * from `apps/cli/node_modules/@deepseek-ai`.
 * @param {string} root
 * @returns {number} links created/updated
 */
function hoistDeepseekAiPackages(root) {
  const toDir = path.join(root, "node_modules", "@deepseek-ai");
  const sources = [
    path.join(root, "node_modules", ".pnpm", "node_modules", "@deepseek-ai"),
    path.join(root, "apps", "cli", "node_modules", "@deepseek-ai"),
  ].filter((dir) => fs.existsSync(dir));

  if (sources.length === 0) {
    fail(
      "Missing @deepseek-ai package links under node_modules/.pnpm/node_modules or apps/cli/node_modules"
    );
  }

  fs.mkdirSync(toDir, { recursive: true });
  let created = 0;
  /** @type {Set<string>} */
  const seen = new Set();

  for (const fromDir of sources) {
    for (const name of fs.readdirSync(fromDir)) {
      if (seen.has(name)) {
        continue;
      }
      const src = path.join(fromDir, name);
      try {
        fs.statSync(src);
      } catch {
        continue;
      }
      const dest = path.join(toDir, name);
      try {
        fs.rmSync(dest, { recursive: true, force: true });
      } catch {
        // ignore
      }
      fs.symlinkSync(path.relative(toDir, src), dest);
      seen.add(name);
      created += 1;
    }
  }
  return created;
}

/**
 * Phase 2: delete matching dirs under node_modules/.pnpm (name prefix).
 * Do NOT add MCP / @modelcontextprotocol prefixes here.
 */
const PNPM_PRUNE_PREFIXES = [
  "@anthropic-ai+claude-agent-sdk",
  "@openai+codex@",
  "mermaid@",
  "@mermaid-js+",
  "typescript@",
  "oxlint@",
  "@oxlint+",
  "@oxlint-tsgolint+",
  "rolldown@",
  "@rolldown+",
  "lefthook@",
  "lefthook-darwin-",
  "lefthook-linux-",
  "lefthook-windows-",
  "eslint@",
  "eslint-plugin-",
  "@eslint+",
  "playwright@",
  "playwright-core@",
  "@playwright+",
  "happy-dom@",
  "jsdom@",
  "vitest@",
  "@vitest+",
  "jscpd@",
  "publint@",
];

/**
 * Phase 3: additional .pnpm prefixes (UI / syntax / build leftovers).
 * Keep MCP. Do not add openai@ / @google+genai (LLM path may need them).
 */
const PNPM_PRUNE_PREFIXES_PHASE3 = [
  "vitepress@",
  "vite@",
  "@vitejs+",
  "vite-tsconfig-paths@",
  "vitepress-plugin-mermaid@",
  "shiki@",
  "@shikijs+",
  "cytoscape@",
  "cytoscape-fcose@",
  "katex@",
  "caniuse-lite@",
  "postject@",
  "lightningcss@",
  "lightningcss-darwin-",
  "lightningcss-linux-",
  "lightningcss-win32-",
  "esbuild@",
  "@esbuild+",
  "sharp@",
  "@img+sharp",
  "node-pty@",
  "@vscode+ripgrep",
  "react-dom@",
  "react@",
  "react-refresh@",
  "react-is@",
  "preact@",
  "zustand@",
  "use-sync-external-store@",
];

/** After copy: strip SPA assets; keep resolvable dsh-web-frontend + index.html. */
const PHASE3_DELETE_PATHS = [
  path.join("apps", "web", "dist", "assets"),
  path.join("apps", "web", "dist", "preview"),
  path.join("apps", "web", "dist", "preview.html"),
  path.join("apps", "web", "public"),
];

/** Paths under resources/harness that must survive (best-effort check). */
const MCP_KEEP_GLOBS = [
  "packages/mcp",
  "node_modules/.pnpm/@modelcontextprotocol+sdk@",
];

function fail(message) {
  console.error(`[build:harness] ${message}`);
  process.exit(1);
}

function resolveHarnessSource() {
  const raw = process.env.BENDO_HARNESS_DIR?.trim();
  if (!raw) {
    return defaultHarnessRoot;
  }
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
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

function gitShortRev(repoDir) {
  const result = spawnSync("git", ["-C", repoDir, "rev-parse", "--short", "HEAD"], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return null;
  }
  const rev = (result.stdout || "").trim();
  return rev || null;
}

function stripEnvFiles(root) {
  /** @type {string[]} */
  const removed = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".git") {
          continue;
        }
        walk(full);
        continue;
      }
      if (ENV_NAMES.includes(ent.name) || /^\.env(\.|$)/u.test(ent.name)) {
        fs.rmSync(full, { force: true });
        removed.push(path.relative(root, full));
      }
    }
  };
  walk(root);
  return removed;
}

/**
 * @param {string} root
 * @param {readonly string[]} prefixes
 * @returns {string[]}
 */
function prunePnpmByPrefixes(root, prefixes) {
  const pnpmDir = path.join(root, "node_modules", ".pnpm");
  /** @type {string[]} */
  const removed = [];
  if (!fs.existsSync(pnpmDir)) {
    return removed;
  }

  let entries;
  try {
    entries = fs.readdirSync(pnpmDir, { withFileTypes: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Failed to read ${pnpmDir}: ${message}`);
  }

  for (const ent of entries) {
    if (!ent.isDirectory()) {
      continue;
    }
    const name = ent.name;
    // Never prune MCP SDK / dsh-mcp packages.
    if (
      name.startsWith("@modelcontextprotocol+") ||
      name.includes("dsh-mcp") ||
      name.startsWith("@deepseek-ai+dsh-mcp")
    ) {
      continue;
    }
    const hit = prefixes.some((prefix) => name.startsWith(prefix));
    if (!hit) {
      continue;
    }
    const full = path.join(pnpmDir, name);
    fs.rmSync(full, { recursive: true, force: true });
    removed.push(path.relative(root, full));
  }

  return removed;
}

/**
 * Phase 3 path deletes + ensure minimal web frontend dist for resolveDistIndex.
 * @param {string} root
 * @returns {string[]}
 */
function phase3StripWebUi(root) {
  /** @type {string[]} */
  const removed = [];
  for (const rel of PHASE3_DELETE_PATHS) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      continue;
    }
    fs.rmSync(full, { recursive: true, force: true });
    removed.push(rel.split(path.sep).join("/"));
  }

  const distDir = path.join(root, "apps", "web", "dist");
  const indexHtml = path.join(distDir, "index.html");
  fs.mkdirSync(distDir, { recursive: true });
  if (!fs.existsSync(indexHtml)) {
    fs.writeFileSync(
      indexHtml,
      "<!doctype html><html><head><meta charset=\"utf-8\"><title>Bendo Agent</title></head><body><p>Bendo uses the local chat-bridge; dsh browser UI is not shipped.</p></body></html>\n"
    );
    removed.push("(wrote stub apps/web/dist/index.html)");
  }

  const pkg = path.join(root, "apps", "web", "package.json");
  if (!fs.existsSync(pkg)) {
    fail(`Phase 3 requires apps/web/package.json for @deepseek-ai/dsh-web-frontend resolve`);
  }

  return removed;
}

function assertMcpKept(root) {
  const findings = [];
  for (const glob of MCP_KEEP_GLOBS) {
    if (glob.includes("@modelcontextprotocol+sdk@")) {
      const pnpmDir = path.join(root, "node_modules", ".pnpm");
      if (!fs.existsSync(pnpmDir)) {
        continue;
      }
      const match = fs
        .readdirSync(pnpmDir)
        .find((name) => name.startsWith("@modelcontextprotocol+sdk@"));
      if (match) {
        findings.push(`node_modules/.pnpm/${match}`);
      }
      continue;
    }
    const full = path.join(root, glob);
    if (fs.existsSync(full)) {
      findings.push(glob);
    }
  }
  return findings;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpGetOk(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode != null && res.statusCode >= 200 && res.statusCode < 300);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function killChildTree(child) {
  const pid = child.pid;
  if (pid == null) {
    return;
  }
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      return;
    }
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  } catch {
    // already exited
  }
}

/**
 * Boot slim harness briefly; require bridge health 2xx.
 * @param {string} harnessDir
 */
async function smokeBoot(harnessDir) {
  if (process.env.BENDO_HARNESS_SKIP_SMOKE?.trim() === "1") {
    console.log("[build:harness] Smoke skipped (BENDO_HARNESS_SKIP_SMOKE=1)");
    return { ok: true, skipped: true };
  }

  if (await httpGetOk(SMOKE_HEALTH_URL)) {
    return {
      ok: false,
      reason: `Smoke port ${SMOKE_PORT} already in use (${SMOKE_HEALTH_URL}). Free it and re-run.`,
    };
  }

  const dshHome = fs.mkdtempSync(path.join(os.tmpdir(), "bendo-harness-smoke-"));
  const secret = `bendo-smoke-${Date.now()}`;
  const dshBin = path.join(harnessDir, DSH_BIN_REL);
  const args = [
    dshBin,
    "web",
    "--patch",
    DORO_PATCH,
    "--no-open",
    "--port",
    String(SMOKE_PORT),
  ];

  console.log(`[build:harness] Smoke: spawning node ${args.join(" ")}`);
  const child = spawn(process.execPath, args, {
    cwd: harnessDir,
    env: {
      ...process.env,
      DSH_HOME: dshHome,
      DSH_CHAT_BRIDGE_SECRET: secret,
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });

  let stderrTail = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk) => {
    stderrTail = `${stderrTail}${chunk}`.slice(-4000);
  });
  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => {
    stderrTail = `${stderrTail}${chunk}`.slice(-4000);
  });

  const started = Date.now();
  let healthy = false;
  let earlyExit = null;

  child.once("exit", (code, signal) => {
    earlyExit =
      signal != null ? `signal ${signal}` : `code ${code ?? "unknown"}`;
  });

  while (Date.now() - started < SMOKE_TIMEOUT_MS) {
    if (earlyExit) {
      break;
    }
    if (await httpGetOk(SMOKE_HEALTH_URL)) {
      healthy = true;
      break;
    }
    await sleep(SMOKE_POLL_MS);
  }

  killChildTree(child);
  await sleep(300);
  try {
    fs.rmSync(dshHome, { recursive: true, force: true });
  } catch {
    // best effort
  }

  if (!healthy) {
    const detail = earlyExit
      ? `process exited (${earlyExit})`
      : `timeout after ${SMOKE_TIMEOUT_MS}ms`;
    return {
      ok: false,
      reason: `${detail}\n--- harness output (tail) ---\n${stderrTail}`,
    };
  }

  console.log(`[build:harness] Smoke OK — ${SMOKE_HEALTH_URL}`);
  return { ok: true, skipped: false };
}

const harnessRoot = resolveHarnessSource();

if (!fs.existsSync(path.join(harnessRoot, "package.json"))) {
  fail(`deepseek-harness not found at ${harnessRoot}`);
}

const cordisSrc = path.join(harnessRoot, DORO_CORDIS);
if (!fs.existsSync(cordisSrc)) {
  fail(`Missing Doro overlay: ${cordisSrc}`);
}

const dshBinSrc = path.join(harnessRoot, DSH_BIN_REL);
if (!fs.existsSync(dshBinSrc)) {
  fail(
    `Missing built dsh CLI bin: ${dshBinSrc} (run harness build so apps/cli/lib/bin.js exists)`
  );
}

if (!fs.existsSync(path.join(harnessRoot, "node_modules"))) {
  fail(`Missing node_modules in ${harnessRoot} (run pnpm install in harness first)`);
}

console.log(`[build:harness] Source: ${harnessRoot}`);
console.log(`[build:harness] Output: ${outDir}`);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(outDir), { recursive: true });

const rsyncArgs = [
  "-a",
  "--delete",
  ...RSYNC_EXCLUDES.flatMap((pattern) => ["--exclude", pattern]),
  `${harnessRoot}${path.sep}`,
  `${outDir}${path.sep}`,
];

console.log(`[build:harness] rsync (${RSYNC_EXCLUDES.length} excludes)…`);
const rsync = spawnSync("rsync", rsyncArgs, { stdio: "inherit" });
if (rsync.error?.code === "ENOENT") {
  fail("rsync not found on PATH (required for build:harness on macOS/Linux)");
}
if (rsync.status !== 0) {
  fail(`rsync failed (exit ${rsync.status ?? "unknown"})`);
}

const stripped = stripEnvFiles(outDir);
for (const rel of stripped) {
  console.log(`[build:harness] Removed secret-prone file: ${rel}`);
}

const cordisOut = path.join(outDir, DORO_CORDIS);
if (!fs.existsSync(cordisOut)) {
  fail(`Doro cordis.yml missing after copy: ${cordisOut}`);
}

const dshBinOut = path.join(outDir, DSH_BIN_REL);
if (!fs.existsSync(dshBinOut)) {
  fail(`dsh bin missing after copy: ${dshBinOut}`);
}

if (!fs.existsSync(path.join(outDir, "package.json"))) {
  fail(`package.json missing after copy: ${outDir}`);
}

const sizeBeforePhase2 = dirSizeBytes(outDir);
console.log(
  `[build:harness] Size after rsync: ${sizeBeforePhase2 == null ? "unknown" : formatBytes(sizeBeforePhase2)}`
);

const hoisted = hoistDeepseekAiPackages(outDir);
console.log(
  `[build:harness] Hoisted ${hoisted} @deepseek-ai packages for plain-Node / Electron-as-Node resolve`
);

console.log(
  `[build:harness] Phase 2 prune (.pnpm prefixes × ${PNPM_PRUNE_PREFIXES.length})…`
);
const prunedPnpm2 = prunePnpmByPrefixes(outDir, PNPM_PRUNE_PREFIXES);
for (const rel of prunedPnpm2.slice(0, 20)) {
  console.log(`[build:harness] Pruned ${rel}`);
}
if (prunedPnpm2.length > 20) {
  console.log(`[build:harness] … and ${prunedPnpm2.length - 20} more .pnpm dirs`);
}
console.log(`[build:harness] Phase 2 removed ${prunedPnpm2.length} .pnpm package dirs`);

const sizeAfterPhase2 = dirSizeBytes(outDir);
console.log(
  `[build:harness] Size after Phase 2: ${sizeAfterPhase2 == null ? "unknown" : formatBytes(sizeAfterPhase2)}`
);

console.log(
  `[build:harness] Phase 3 prune (.pnpm prefixes × ${PNPM_PRUNE_PREFIXES_PHASE3.length})…`
);
const prunedPnpm3 = prunePnpmByPrefixes(outDir, PNPM_PRUNE_PREFIXES_PHASE3);
for (const rel of prunedPnpm3.slice(0, 30)) {
  console.log(`[build:harness] Pruned ${rel}`);
}
if (prunedPnpm3.length > 30) {
  console.log(`[build:harness] … and ${prunedPnpm3.length - 30} more .pnpm dirs`);
}
console.log(`[build:harness] Phase 3 removed ${prunedPnpm3.length} .pnpm package dirs`);

const strippedWeb = phase3StripWebUi(outDir);
for (const rel of strippedWeb) {
  console.log(`[build:harness] Phase 3 stripped ${rel}`);
}

// Re-hoist after .pnpm deletes so root links do not point at removed trees.
const hoistedAgain = hoistDeepseekAiPackages(outDir);
console.log(`[build:harness] Re-hoisted ${hoistedAgain} @deepseek-ai packages after Phase 3`);

const mcpKept = assertMcpKept(outDir);
if (mcpKept.length === 0) {
  console.warn(
    "[build:harness] Warning: no MCP package paths found in output (optional if source tree layout differs)"
  );
} else {
  console.log(`[build:harness] MCP kept: ${mcpKept.join(", ")}`);
}

const sizeAfterPhase3 = dirSizeBytes(outDir);

let desktopPkg = { version: "0.0.0" };
try {
  desktopPkg = JSON.parse(
    fs.readFileSync(path.join(desktopRoot, "package.json"), "utf8")
  );
} catch {
  // keep default
}

let harnessPkg = { version: "unknown" };
try {
  harnessPkg = JSON.parse(
    fs.readFileSync(path.join(outDir, "package.json"), "utf8")
  );
} catch {
  // keep default
}

const manifest = {
  kind: "bendo-slim-harness",
  desktopPackageVersion: desktopPkg.version ?? "0.0.0",
  sourcePackageName: harnessPkg.name ?? "@deepseek-ai/dsh-root",
  sourcePackageVersion: harnessPkg.version ?? "unknown",
  sourceRev: gitShortRev(harnessRoot),
  preparedAt: new Date().toISOString(),
  dshBin: DSH_BIN_REL.split(path.sep).join("/"),
  doroCordis: DORO_CORDIS.split(path.sep).join("/"),
  sizeBytesBeforePhase2: sizeBeforePhase2,
  sizeHumanBeforePhase2:
    sizeBeforePhase2 == null ? null : formatBytes(sizeBeforePhase2),
  sizeBytesAfterPhase2: sizeAfterPhase2,
  sizeHumanAfterPhase2:
    sizeAfterPhase2 == null ? null : formatBytes(sizeAfterPhase2),
  sizeBytes: sizeAfterPhase3,
  sizeHuman: sizeAfterPhase3 == null ? null : formatBytes(sizeAfterPhase3),
  prune: "denylist-v1+phase2+phase3",
  phase2PrunedPnpmCount: prunedPnpm2.length,
  phase3PrunedPnpmCount: prunedPnpm3.length,
  phase3StrippedPaths: strippedWeb,
  hoistedDeepseekAiCount: hoistedAgain,
  mcpKept,
  mcpCordisEnabled: false,
  webUiShipped: "stub-index-only",
};

fs.writeFileSync(
  path.join(outDir, "MANIFEST.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(
  `[build:harness] Size after Phase 3: ${manifest.sizeHuman ?? "size unknown"}` +
    (sizeBeforePhase2 != null && sizeAfterPhase3 != null
      ? ` (saved ${formatBytes(sizeBeforePhase2 - sizeAfterPhase3)} vs post-rsync)`
      : "")
);

const smoke = await smokeBoot(outDir);
if (!smoke.ok) {
  fail(`Smoke boot failed: ${smoke.reason}`);
}

manifest.smoke = {
  ok: true,
  skipped: Boolean(smoke.skipped),
  port: SMOKE_PORT,
  healthUrl: SMOKE_HEALTH_URL,
};
fs.writeFileSync(
  path.join(outDir, "MANIFEST.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(
  `[build:harness] Ready at ${outDir} (${manifest.sizeHuman ?? "size unknown"})`
);
console.log(
  `[build:harness] Manifest: desktop=${manifest.desktopPackageVersion} harness=${manifest.sourcePackageVersion} rev=${manifest.sourceRev ?? "n/a"} prune=${manifest.prune}`
);
