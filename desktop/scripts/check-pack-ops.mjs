#!/usr/bin/env node
/**
 * Pack ops gate (ship bước 1): version + BENDO_CLOUD_API_URL bake-ready + cloud smoke.
 * Clerk allowlist cannot be verified from here — prints the exact Dashboard URLs.
 *
 * Usage (from desktop/):
 *   npm run ops:pack-ready
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.join(__dirname, "..");

/** @type {string[]} */
const failures = [];
/** @type {string[]} */
const warnings = [];

/**
 * Load KEY=VALUE from desktop/.env into process.env when unset (same rules as build:bendo).
 */
function loadDesktopDotEnv() {
  const filePath = path.join(desktopRoot, ".env");
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch {
    // Optional: CI may export BENDO_CLOUD_API_URL with no desktop/.env.
    // Unset URL is reported by the check below.
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
    process.env[key] = value;
  }
}

/**
 * @param {string} url
 * @returns {Promise<{ ok: boolean, status: number, detail: string }>}
 */
async function probe(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    return { ok: true, status: res.status, detail: `HTTP ${res.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, detail: message };
  }
}

loadDesktopDotEnv();

const pkgPath = path.join(desktopRoot, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const version = String(pkg.version ?? "");
console.log(`[ops:pack-ready] desktop version: ${version}`);
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/u.test(version)) {
  failures.push(`Invalid semver in package.json: ${version}`);
}
if (version === "0.0.1" || version === "0.0.0") {
  failures.push(`Bump desktop/package.json version before pack (still ${version}).`);
}

const cloudRaw = process.env.BENDO_CLOUD_API_URL?.trim() ?? "";
const cloudUrl = cloudRaw.replace(/\/$/u, "");
if (!cloudUrl) {
  failures.push(
    "BENDO_CLOUD_API_URL unset. Set in desktop/.env (loaded by build:bendo) or export in the environment."
  );
} else {
  let parsed;
  try {
    parsed = new URL(cloudUrl);
  } catch {
    failures.push(`BENDO_CLOUD_API_URL is not a valid URL: ${cloudUrl}`);
  }
  if (parsed && parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    failures.push(`BENDO_CLOUD_API_URL must be http(s): ${cloudUrl}`);
  }
  if (parsed) {
    console.log(`[ops:pack-ready] BENDO_CLOUD_API_URL: ${cloudUrl}`);
    console.log(
      `[ops:pack-ready] bake target: resources/bendo-app/bendo-public-config.json → bendoCloudApiUrl`
    );

    const health = await probe(`${cloudUrl}/api/health`);
    console.log(`[ops:pack-ready] GET /api/health → ${health.detail}`);
    if (!health.ok || health.status !== 200) {
      failures.push(
        `Cloud /api/health expected HTTP 200 (got ${health.detail}). Check Vercel deploy.`
      );
    }

    const me = await probe(`${cloudUrl}/api/me`);
    console.log(`[ops:pack-ready] GET /api/me → ${me.detail}`);
    if (!me.ok) {
      failures.push(`Cloud /api/me unreachable: ${me.detail}`);
    } else if (me.status === 404) {
      failures.push("Cloud /api/me returned 404 — cutover route missing on deploy?");
    } else if (me.status >= 500) {
      failures.push(`Cloud /api/me server error: HTTP ${me.status}`);
    } else if (me.status !== 401 && me.status !== 200) {
      warnings.push(
        `/api/me returned HTTP ${me.status} (expect 401 unauthenticated or 200 with session).`
      );
    }
  }
}

console.log("");
console.log("[ops:pack-ready] Clerk Dashboard — configure manually (not verifiable here):");
console.log("  Allowed origins / redirect URLs should include:");
console.log("    http://127.0.0.1:3000");
console.log("    http://127.0.0.1:3000/auth/desktop-handoff");
console.log("    http://localhost:3000          (if you use localhost)");
console.log("    http://localhost:3000/auth/desktop-handoff");
console.log("  Do not register bendo:// in Clerk.");
console.log("  Docs: docs/desktop-oauth-bendo-protocol.md §2");
warnings.push(
  "Clerk allowlist is owner-only — confirm in Dashboard before clean-machine login E2E."
);

console.log("");
if (warnings.length > 0) {
  for (const w of warnings) {
    console.warn(`[ops:pack-ready] WARN: ${w}`);
  }
}
if (failures.length > 0) {
  for (const f of failures) {
    console.error(`[ops:pack-ready] FAIL: ${f}`);
  }
  process.exit(1);
}

console.log("[ops:pack-ready] OK — version + cloud URL smoke passed (Clerk still manual).");
console.log("[ops:pack-ready] Next: npm run dist:win (on Windows/CI) after harness ready.");
