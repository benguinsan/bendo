#!/usr/bin/env node
/**
 * Cross-platform electron-builder launcher.
 *
 * Sets CSC_IDENTITY_AUTO_DISCOVERY=false in Node (works under cmd.exe on
 * Windows). POSIX `VAR=value cmd` in package.json scripts fails on Win npm.
 *
 * Usage (from desktop/):
 *   node scripts/run-electron-builder.mjs --dir
 *   node scripts/run-electron-builder.mjs --win
 *   node scripts/run-electron-builder.mjs --mac dmg
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const builderCli = require.resolve("electron-builder/cli.js");
const args = process.argv.slice(2);

const child = spawn(process.execPath, [builderCli, ...args], {
  cwd: root,
  env: {
    ...process.env,
    CSC_IDENTITY_AUTO_DISCOVERY: "false",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
    return;
  }
  process.exit(code ?? 0);
});
