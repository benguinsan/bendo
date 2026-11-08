#!/usr/bin/env node
/**
 * Copy a pruned DeepSeek Harness tree into desktop/resources/harness for
 * electron-builder extraResources.
 *
 * v1: denylist rsync (docs/tests/python/…).
 * Phase 2: hoist @deepseek-ai + prune bulk/tooling .pnpm; keep MCP on disk.
 * Phase 3: stub dsh web UI dist (keep package + index.html), drop client src,
 * prune more UI/build .pnpm. Rebuild ABI-sensitive natives (fs-ext) for the
 * desktop Electron version (packaged spawn = Electron-as-Node). Smoke-boot
 * with Electron-as-Node (same as release).
 *
 * Usage (from desktop/):
 *   npm run build:harness
 *
 * Override source:
 *   BENDO_HARNESS_DIR=/path/to/deepseek-harness npm run build:harness
 *
 * Skip smoke (faster iterate):
 *   BENDO_HARNESS_SKIP_SMOKE=1 npm run build:harness
 *
 * Copy: Node fs denylist (rsync-compatible exclude list) — works on
 * darwin / linux / win32. Hoist @deepseek-ai via symlink (posix) or copy (win32).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SMOKE_HEALTH_URL,
  SMOKE_PORT,
  smokeBoot,
} from "./lib/harness-smoke.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.join(__dirname, "..");
const defaultHarnessRoot = path.resolve(desktopRoot, "..", "deepseek-harness");
const outDir = path.join(desktopRoot, "resources", "harness");
const DORO_CORDIS = path.join("bendo-agent(doro)", "cordis.yml");
const DSH_BIN_REL = path.join("apps", "cli", "lib", "bin.js");

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

/** Top-level / path prefixes to drop (same patterns as former rsync --exclude). */
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
 * @param {string} pattern rsync-style exclude
 * @returns {RegExp | null} for simple star globs (e.g. "*.map")
 */
function starGlobToRegExp(pattern) {
  if (!pattern.includes("*")) {
    return null;
  }
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replace(/\*\*/gu, "{{GLOBSTAR}}")
    .replace(/\*/gu, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/gu, ".*");
  return new RegExp(`^${escaped}$`, "u");
}

/**
 * Approximate rsync --exclude matching for a path relative to the tree root
 * (posix separators).
 * @param {string} relPosix
 * @param {string} pattern
 */
function matchesExclude(relPosix, pattern) {
  const trimmed = pattern.replace(/\/$/u, "");
  if (trimmed.startsWith("**/")) {
    const rest = trimmed.slice(3);
    const re = starGlobToRegExp(rest);
    if (re) {
      return (
        re.test(relPosix) ||
        relPosix.split("/").some((seg) => re.test(seg)) ||
        re.test(relPosix.split("/").at(-1) ?? "")
      );
    }
    return (
      relPosix === rest ||
      relPosix.endsWith(`/${rest}`) ||
      relPosix.includes(`/${rest}/`)
    );
  }
  if (trimmed.includes("**/")) {
    const [pre, post] = trimmed.split("/**/");
    if (!(relPosix === pre || relPosix.startsWith(`${pre}/`))) {
      return false;
    }
    if (!post) {
      return true;
    }
    return (
      relPosix.includes(`/${post}/`) ||
      relPosix.endsWith(`/${post}`) ||
      relPosix.includes(`/${post}`)
    );
  }
  if (pattern.endsWith("/")) {
    return relPosix === trimmed || relPosix.startsWith(`${trimmed}/`);
  }
  const re = starGlobToRegExp(trimmed);
  if (re) {
    return re.test(relPosix) || re.test(relPosix.split("/").at(-1) ?? "");
  }
  return relPosix === trimmed || relPosix.endsWith(`/${trimmed}`);
}

/**
 * @param {string} relPosix
 */
function shouldExcludeRel(relPosix) {
  return RSYNC_EXCLUDES.some((pattern) => matchesExclude(relPosix, pattern));
}

/**
 * Recursive copy with denylist (Win-safe; no rsync).
 * Preserves symlinks/junctions (like rsync -a) so pnpm layout stays compact.
 * @param {string} srcRoot
 * @param {string} destRoot
 */
function copyTreeWithExcludes(srcRoot, destRoot) {
  fs.mkdirSync(path.dirname(destRoot), { recursive: true });
  fs.cpSync(srcRoot, destRoot, {
    recursive: true,
    verbatimSymlinks: true,
    filter: (src) => {
      const rel = path.relative(srcRoot, src);
      if (!rel || rel === ".") {
        return true;
      }
      const relPosix = rel.split(path.sep).join("/");
      return !shouldExcludeRel(relPosix);
    },
  });
}

/**
 * win32 only: cpSync(verbatimSymlinks) creates links with no type; Node then
 * autodetects file vs dir from whether the target exists at create time, so
 * early node_modules → packages links become file symlinks and break resolve.
 * Recreate those with type "dir", keeping the same (relative) target text.
 * No junctions (absolute paths would bake the CI path into the installer).
 * Also rewrite absolute/junction targets that still point into harnessRoot to
 * in-tree relative links, so the packaged tree does not depend on the source checkout.
 * @param {string} root outDir
 * @param {string} harnessRoot source harness checkout
 */
function repairWin32DirectorySymlinks(root, harnessRoot) {
  if (process.platform !== "win32") {
    return;
  }

  /** @type {string[]} */
  const repaired = [];
  /** @type {string[]} */
  const rewrittenFromSource = [];
  /** @type {string[]} */
  const sourceMissingInOut = [];

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
      const relPosix = path.relative(root, full).split(path.sep).join("/");
      if (shouldExcludeRel(relPosix)) {
        continue;
      }
      if (ent.isSymbolicLink()) {
        let targetText;
        try {
          targetText = fs.readlinkSync(full);
        } catch {
          continue;
        }
        const resolved = path.resolve(dir, targetText);
        const relToRoot = path.relative(root, resolved);
        const insideOut =
          !relToRoot.startsWith("..") && !path.isAbsolute(relToRoot);

        if (insideOut) {
          let targetIsDir = false;
          try {
            targetIsDir = fs.statSync(resolved).isDirectory();
          } catch {
            // Missing target (e.g. excluded test-support) — leave untouched.
            continue;
          }
          if (!targetIsDir) {
            continue;
          }
          try {
            fs.unlinkSync(full);
            fs.symlinkSync(targetText, full, "dir");
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            fail(`win32 symlink repair failed for ${relPosix} → ${targetText} (${message})`);
          }
          repaired.push(relPosix);
          continue;
        }

        // Absolute / escaping targets that still point into the source harness.
        const relToHarness = path.relative(harnessRoot, resolved);
        if (relToHarness.startsWith("..") || path.isAbsolute(relToHarness)) {
          continue;
        }
        const mapped = path.join(root, relToHarness);
        let mappedIsDir = false;
        try {
          mappedIsDir = fs.statSync(mapped).isDirectory();
        } catch {
          sourceMissingInOut.push(relPosix);
          continue;
        }
        if (!mappedIsDir) {
          continue;
        }
        const relativeTarget = path.relative(dir, mapped);
        try {
          fs.unlinkSync(full);
          fs.symlinkSync(relativeTarget, full, "dir");
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          fail(
            `win32 symlink repair failed for ${relPosix} → ${relativeTarget} (${message})`
          );
        }
        repaired.push(relPosix);
        rewrittenFromSource.push(relPosix);
        continue;
      }
      if (ent.isDirectory()) {
        walk(full);
      }
    }
  };

  walk(root);
  console.log(
    `[build:harness] win32: repaired ${repaired.length} directory symlinks (${rewrittenFromSource.length} rewritten from source-harness targets, ${sourceMissingInOut.length} source-harness targets left: missing in out)`
  );
}

/**
 * Hoist `@deepseek-ai/*` into root `node_modules/@deepseek-ai/` so Doro overlay
 * ESM imports resolve under plain Node / Electron-as-Node (pnpm+tsx differs).
 * Prefer `.pnpm/node_modules/@deepseek-ai` (full transitive set), then fill gaps
 * from `apps/cli/node_modules/@deepseek-ai`.
 * posix: relative symlinks; win32: directory copy (NSIS-safe).
 * @param {string} root
 * @returns {number} links/copies created/updated
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
  let skipped = 0;
  /** @type {Set<string>} */
  const seen = new Set();
  const useCopy = process.platform === "win32";

  for (const fromDir of sources) {
    for (const name of fs.readdirSync(fromDir)) {
      if (seen.has(name)) {
        continue;
      }
      const src = path.join(fromDir, name);
      try {
        fs.statSync(src);
      } catch {
        skipped += 1;
        continue;
      }
      const dest = path.join(toDir, name);
      try {
        fs.rmSync(dest, { recursive: true, force: true });
      } catch {
        // ignore
      }
      if (useCopy) {
        fs.cpSync(src, dest, { recursive: true });
      } else {
        fs.symlinkSync(path.relative(toDir, src), dest);
      }
      seen.add(name);
      created += 1;
    }
  }
  if (skipped > 0) {
    console.log(
      `[build:harness] Hoist skipped ${skipped} unresolvable @deepseek-ai entries`
    );
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
  // Keep native/runtime deps that default `dsh web` plugins still import at boot:
  // node-pty (subprocess-local), sharp (attachment-local), @vscode/ripgrep (tool-fs-search).
  // Pruning them leaves dangling package symlinks → ERR_MODULE_NOT_FOUND and harness exit 1.
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

/**
 * Default `dsh web` still loads these packages; their native deps must resolve
 * after Phase 2/3 .pnpm prune (dangling symlinks → boot exit 1).
 * @type {ReadonlyArray<{ fromRel: string, id: string }>}
 */
const CRITICAL_RUNTIME_RESOLVES = [
  {
    fromRel: path.join(
      "packages",
      "subprocess",
      "subprocess-local",
      "lib",
      "index.js"
    ),
    id: "node-pty",
  },
  {
    fromRel: path.join(
      "packages",
      "attachment",
      "attachment-local",
      "lib",
      "index.js"
    ),
    id: "sharp",
  },
  {
    fromRel: path.join(
      "packages",
      "fs",
      "tool-fs-search",
      "lib",
      "index.js"
    ),
    id: "@vscode/ripgrep",
  },
];

/** Log an error and exit prepare with status 1. */
function fail(message) {
  console.error(`[build:harness] ${message}`);
  process.exit(1);
}

/** Harness checkout path: `BENDO_HARNESS_DIR` or the monorepo default. */
function resolveHarnessSource() {
  const raw = process.env.BENDO_HARNESS_DIR?.trim();
  if (!raw) {
    return defaultHarnessRoot;
  }
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

/** Human-readable byte size (B/KB/MB/…). */
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

/** Directory size in bytes via `du -sk`, or null if unavailable. */
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

/** Short git HEAD of `repoDir`, or null when not a git checkout. */
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

/** Remove `.env*` files under `root` (never ship secrets in resources). */
function stripEnvFiles(root) {
  /** @type {string[]} */
  const removed = [];
  /** Recursively walk directories, skipping node_modules and .git. */
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
 * Fail prepare if prune left dangling runtime deps that crash packaged boot.
 * @param {string} root
 */
function assertCriticalRuntimeResolves(root) {
  for (const { fromRel, id } of CRITICAL_RUNTIME_RESOLVES) {
    const fromFile = path.join(root, fromRel);
    if (!fs.existsSync(fromFile)) {
      console.warn(
        `[build:harness] Skip resolve check for ${id} (missing ${fromRel})`
      );
      continue;
    }
    try {
      createRequire(fromFile).resolve(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      fail(
        `Critical runtime package "${id}" does not resolve from ${fromRel} after prune (${message}). ` +
          `Do not prune its .pnpm prefix.`
      );
    }
    console.log(`[build:harness] Runtime resolve ok: ${id} ← ${fromRel}`);
  }
}

/**
 * Remove matching `.pnpm` virtual-store prefixes under `root`.
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

/** Return paths proving required MCP packages survived prune. */
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

/**
 * Packaged spawn uses Electron-as-Node (ABI ≠ system Node). Packages that
 * compile against NODE_MODULE_VERSION (not N-API prebuilds) must be rebuilt
 * for the desktop Electron version or boot fails with ERR_DLOPEN_FAILED.
 * @type {readonly string[]}
 */
const ELECTRON_GYP_REBUILD_PACKAGES = ["fs-ext"];

/**
 * Resolve desktop Electron binary path + version for gyp rebuild / smoke.
 * @returns {{ electronBin: string, version: string }}
 */
function resolveDesktopElectron() {
  let electronPkgJson;
  try {
    electronPkgJson = createRequire(import.meta.url).resolve(
      "electron/package.json",
      { paths: [desktopRoot] }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Cannot resolve desktop electron package: ${message}`);
  }
  const version = JSON.parse(fs.readFileSync(electronPkgJson, "utf8")).version;
  /** @type {string} */
  let electronBin;
  try {
    electronBin = createRequire(electronPkgJson)("electron");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(
      `Cannot resolve Electron binary (run npm install in desktop/): ${message}`
    );
  }
  if (typeof electronBin !== "string" || !fs.existsSync(electronBin)) {
    fail(`Electron binary missing at ${String(electronBin)}`);
  }
  return { version, electronBin };
}

/**
 * Locate pnpm virtual-store package roots for a dependency name
 * (…/node_modules/.pnpm/{name}@{ver}/node_modules/{name}).
 * @param {string} harnessDir
 * @param {string} packageName
 * @returns {string[]}
 */
function findPnpmPackageRoots(harnessDir, packageName) {
  const pnpmDir = path.join(harnessDir, "node_modules", ".pnpm");
  if (!fs.existsSync(pnpmDir)) {
    return [];
  }
  const folderPrefix = packageName.startsWith("@")
    ? `${packageName.replace("/", "+")}@`
    : `${packageName}@`;
  /** @type {string[]} */
  const roots = [];
  for (const entry of fs.readdirSync(pnpmDir)) {
    if (!entry.startsWith(folderPrefix)) {
      continue;
    }
    const candidate = path.join(pnpmDir, entry, "node_modules", packageName);
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      roots.push(candidate);
    }
  }
  return roots;
}

/**
 * node-gyp rebuild native addons for Electron ABI (packaged Electron-as-Node).
 * @param {string} harnessDir
 * @param {string} electronVersion
 */
function rebuildGypNativesForElectron(harnessDir, electronVersion) {
  const arch = process.arch;
  for (const packageName of ELECTRON_GYP_REBUILD_PACKAGES) {
    const roots = findPnpmPackageRoots(harnessDir, packageName);
    if (roots.length === 0) {
      console.warn(
        `[build:harness] No .pnpm package root for ${packageName}; skip Electron rebuild`
      );
      continue;
    }
    for (const pkgRoot of roots) {
      if (!fs.existsSync(path.join(pkgRoot, "binding.gyp"))) {
        console.warn(
          `[build:harness] ${packageName} at ${pkgRoot} has no binding.gyp; skip`
        );
        continue;
      }
      console.log(
        `[build:harness] node-gyp rebuild ${packageName} for Electron ${electronVersion} (${arch})…`
      );
      let nodeGypBin;
      try {
        nodeGypBin = createRequire(import.meta.url).resolve(
          "node-gyp/bin/node-gyp.js",
          { paths: [desktopRoot] }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        fail(
          `Cannot resolve node-gyp from desktop/ (direct devDependency required; run npm install in desktop/): ${message}`
        );
      }
      const result = spawnSync(
        process.execPath,
        [
          nodeGypBin,
          "rebuild",
          `--target=${electronVersion}`,
          `--arch=${arch}`,
          "--dist-url=https://electronjs.org/headers",
        ],
        {
          cwd: pkgRoot,
          encoding: "utf8",
          env: { ...process.env },
        }
      );
      if (result.status !== 0) {
        fail(
          `Failed to rebuild ${packageName} for Electron ${electronVersion}:\n` +
            `${result.stdout ?? ""}\n${result.stderr ?? ""}`
        );
      }
      console.log(`[build:harness] Rebuilt ${packageName} → Electron ABI`);
    }
  }
}

/**
 * Fail prepare if ABI-sensitive natives still cannot load under Electron-as-Node.
 * @param {string} harnessDir
 * @param {string} electronBin
 */
function assertNativesLoadUnderElectron(harnessDir, electronBin) {
  for (const packageName of ELECTRON_GYP_REBUILD_PACKAGES) {
    const roots = findPnpmPackageRoots(harnessDir, packageName);
    for (const pkgRoot of roots) {
      const probe = spawnSync(
        electronBin,
        ["-e", `require(${JSON.stringify(pkgRoot)}); console.log("ok")`],
        {
          encoding: "utf8",
          env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
        }
      );
      if (probe.status !== 0) {
        fail(
          `${packageName} still fails under Electron-as-Node after rebuild:\n` +
            `${probe.stdout ?? ""}\n${probe.stderr ?? ""}`
        );
      }
      console.log(
        `[build:harness] Electron-as-Node load ok: ${packageName}`
      );
    }
  }
}

/**
 * win32 only: after smoke, strip all symlinks into harness-links.json (dirs)
 * and materialize file copies. Fail if any symlink remains.
 * @param {string} root outDir
 */
function writeWin32LinkManifest(root) {
  if (process.platform !== "win32") {
    return;
  }

  /** @type {{ path: string, target: string }[]} */
  const links = [];
  let filesMaterialized = 0;
  let deadRemoved = 0;

  // Pass 1 collects while every link still exists: deleting mid-walk would make
  // later links whose target chain runs through an earlier link look dead.
  // realpath resolves the whole chain, so manifest targets never contain links.
  const realRoot = fs.realpathSync(root);
  /** @type {{ full: string, dir: string, relPosix: string, real: string | null, isDir: boolean }[]} */
  const found = [];

  /** @param {string} dir */
  const walkCollect = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isSymbolicLink()) {
        const relPosix = path.relative(root, full).split(path.sep).join("/");
        let real = null;
        let isDir = false;
        try {
          real = fs.realpathSync(full);
          const relToRoot = path.relative(realRoot, real);
          const insideOut =
            relToRoot !== "" &&
            !relToRoot.startsWith("..") &&
            !path.isAbsolute(relToRoot);
          if (insideOut) {
            isDir = fs.statSync(real).isDirectory();
          } else {
            real = null;
          }
        } catch {
          real = null;
        }
        found.push({ full, dir, relPosix, real, isDir });
        continue;
      }
      if (ent.isDirectory()) {
        walkCollect(full);
      }
    }
  };

  walkCollect(root);

  // Pass 2: strip links; record dirs, materialize files, drop dead/escaping ones.
  for (const { full, dir, relPosix, real, isDir } of found) {
    fs.unlinkSync(full);
    if (real == null) {
      deadRemoved += 1;
    } else if (isDir) {
      // `dir` is a real (non-link) dir under root, so map it into realRoot space.
      const realDir = path.join(realRoot, path.relative(root, dir));
      links.push({
        path: relPosix,
        target: path.relative(realDir, real).split(path.sep).join("/"),
      });
    } else {
      fs.copyFileSync(real, full);
      filesMaterialized += 1;
    }
  }

  links.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  fs.writeFileSync(
    path.join(root, "harness-links.json"),
    `${JSON.stringify({ version: 1, links }, null, 2)}\n`
  );

  /** @type {string[]} */
  const remaining = [];
  /** @param {string} dir */
  const walkGuard = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isSymbolicLink()) {
        remaining.push(path.relative(root, full).split(path.sep).join("/"));
        continue;
      }
      if (ent.isDirectory()) {
        walkGuard(full);
      }
    }
  };
  walkGuard(root);
  if (remaining.length > 0) {
    fail(
      `win32 link strip left ${remaining.length} symlinks (sample: ${remaining.slice(0, 5).join(", ")})`
    );
  }

  const sizeAfter = dirSizeBytes(root);
  console.log(
    `[build:harness] win32: link manifest ${links.length} dirs, ${filesMaterialized} files materialized, ${deadRemoved} dead removed`
  );
  console.log(
    `[build:harness] Size after link strip: ${sizeAfter == null ? "unknown" : formatBytes(sizeAfter)}`
  );
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

console.log(
  `[build:harness] copy tree (${RSYNC_EXCLUDES.length} excludes, platform=${process.platform})…`
);
copyTreeWithExcludes(harnessRoot, outDir);
repairWin32DirectorySymlinks(outDir, harnessRoot);

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
  `[build:harness] Size after copy: ${sizeBeforePhase2 == null ? "unknown" : formatBytes(sizeBeforePhase2)}`
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

assertCriticalRuntimeResolves(outDir);

const { version: electronVersion, electronBin } = resolveDesktopElectron();
rebuildGypNativesForElectron(outDir, electronVersion);
assertNativesLoadUnderElectron(outDir, electronBin);

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
  electronVersionForNatives: electronVersion,
  electronGypRebuildPackages: [...ELECTRON_GYP_REBUILD_PACKAGES],
};

fs.writeFileSync(
  path.join(outDir, "MANIFEST.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(
  `[build:harness] Size after Phase 3: ${manifest.sizeHuman ?? "size unknown"}` +
    (sizeBeforePhase2 != null && sizeAfterPhase3 != null
      ? ` (saved ${formatBytes(sizeBeforePhase2 - sizeAfterPhase3)} vs post-copy)`
      : "")
);

const smoke = await smokeBoot(outDir, electronBin);
if (!smoke.ok) {
  fail(`Smoke boot failed: ${smoke.reason}`);
}

writeWin32LinkManifest(outDir);

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
