import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

import { getBridgeChatUrl, resolveHarnessUrl } from "./harness-url";

const CREDENTIALS_FILE = "bridge-credentials.json";
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type BridgeCredentials = {
  url: string;
  secret: string;
};

type StoredBridgeCredentials = {
  url: string;
  secret: string;
  rotatedAt: string;
};

let cached: BridgeCredentials | null = null;

function credentialsPath(): string {
  return path.join(app.getPath("userData"), CREDENTIALS_FILE);
}

function secretTtlMs(): number {
  const raw = process.env.BENDO_BRIDGE_SECRET_TTL_MS?.trim();
  if (!raw) {
    return DEFAULT_TTL_MS;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    console.warn(
      `[bridge] Invalid BENDO_BRIDGE_SECRET_TTL_MS="${raw}"; using ${DEFAULT_TTL_MS}`
    );
    return DEFAULT_TTL_MS;
  }
  return n;
}

function envSessionSecret(): string | undefined {
  const primary = process.env.DSH_CHAT_BRIDGE_SECRET?.trim();
  if (primary) {
    return primary;
  }
  const alt = process.env.DSH_BENDO_CHAT_SECRET?.trim();
  return alt || undefined;
}

/** Session-only URL from env; invalid values are ignored (not persisted). */
function envSessionUrl(): string | undefined {
  const raw = process.env.DSH_CHAT_BRIDGE_URL?.trim();
  if (!raw) {
    return undefined;
  }
  const resolved = resolveHarnessUrl(raw);
  if (!resolved.ok) {
    console.error(
      `[bridge] Invalid DSH_CHAT_BRIDGE_URL: ${resolved.reason}. Ignoring env URL for this session.`
    );
    return undefined;
  }
  return resolved.url;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parseStored(raw: unknown): StoredBridgeCredentials | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const url = typeof obj.url === "string" ? obj.url.trim() : "";
  const secret = typeof obj.secret === "string" ? obj.secret.trim() : "";
  const rotatedAt =
    typeof obj.rotatedAt === "string" ? obj.rotatedAt.trim() : "";
  if (!url || !secret || !isHttpUrl(url)) {
    return null;
  }
  return { url, secret, rotatedAt };
}

function readStored(): StoredBridgeCredentials | null {
  const filePath = credentialsPath();
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const text = fs.readFileSync(filePath, "utf8");
    return parseStored(JSON.parse(text) as unknown);
  } catch {
    console.warn("[bridge] Ignoring invalid bridge-credentials.json");
    return null;
  }
}

function isExpired(rotatedAt: string, nowMs: number, ttlMs: number): boolean {
  if (!rotatedAt) {
    return true;
  }
  const t = Date.parse(rotatedAt);
  if (!Number.isFinite(t)) {
    return true;
  }
  return nowMs - t >= ttlMs;
}

function writeStored(stored: StoredBridgeCredentials): void {
  const filePath = credentialsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const payload = `${JSON.stringify(stored, null, 2)}\n`;
  fs.writeFileSync(filePath, payload, { encoding: "utf8", mode: 0o600 });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Windows may not support POSIX modes; ignore.
  }
}

function generateSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

function urlHostForLog(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "(invalid-url)";
  }
}

/**
 * Resolve bridge URL + secret for this Electron session.
 * Env overrides are session-only and never written to userData JSON.
 */
export function getBridgeCredentials(): BridgeCredentials {
  if (cached) {
    return cached;
  }

  const sessionSecret = envSessionSecret();
  const sessionUrl = envSessionUrl();
  const derivedUrl = getBridgeChatUrl();
  const stored = readStored();

  if (sessionSecret) {
    const url =
      sessionUrl ??
      (stored && isHttpUrl(stored.url) ? stored.url : derivedUrl);
    cached = { url, secret: sessionSecret };
    console.log(
      `[bridge] Credentials ready (env session) host=${urlHostForLog(url)}`
    );
    return cached;
  }

  const nowMs = Date.now();
  const ttlMs = secretTtlMs();

  if (stored && !isExpired(stored.rotatedAt, nowMs, ttlMs)) {
    const url =
      sessionUrl ?? (isHttpUrl(stored.url) ? stored.url : derivedUrl);
    cached = { url, secret: stored.secret };
    console.log(
      `[bridge] Credentials ready (userData) host=${urlHostForLog(url)}`
    );
    return cached;
  }

  const rotated = Boolean(stored);
  const urlForFile =
    stored && isHttpUrl(stored.url) ? stored.url : derivedUrl;
  const secret = generateSecret();
  const rotatedAt = new Date(nowMs).toISOString();
  writeStored({ url: urlForFile, secret, rotatedAt });

  const url = sessionUrl ?? urlForFile;
  cached = { url, secret };
  if (rotated) {
    console.log(
      `[bridge] Bridge secret rotated host=${urlHostForLog(url)}`
    );
  } else {
    console.log(
      `[bridge] Credentials ready (generated) host=${urlHostForLog(url)}`
    );
  }
  return cached;
}

/** Set DSH bridge env on a child env object when missing (or force for packaged). */
export function applyBridgeCredentialsToEnv(
  env: NodeJS.ProcessEnv,
  options?: { force?: boolean }
): void {
  const { url, secret } = getBridgeCredentials();
  const force = options?.force === true;
  if (force || !env.DSH_CHAT_BRIDGE_URL?.trim()) {
    env.DSH_CHAT_BRIDGE_URL = url;
  }
  if (force || !env.DSH_CHAT_BRIDGE_SECRET?.trim()) {
    env.DSH_CHAT_BRIDGE_SECRET = secret;
  }
}
