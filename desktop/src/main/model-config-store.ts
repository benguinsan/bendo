import fs from "node:fs";
import path from "node:path";

import { app, safeStorage } from "electron";

const CONFIG_FILE = "model-config.json";
const WRITE_ATTEMPTS = 3;
const WRITE_BACKOFF_MS = 100;

export const MODEL_CONFIG_PROVIDERS = [
  "openrouter",
  "vilao",
  "gpt",
  "gemini",
] as const;

export type ModelConfigProvider = (typeof MODEL_CONFIG_PROVIDERS)[number];

export type ModelConfig = {
  provider: ModelConfigProvider;
  endpoint: string;
  apiKey: string;
  model: string;
};

type StoredModelConfigFile = {
  provider: ModelConfigProvider;
  endpoint: string;
  model: string;
  /** Base64 of safeStorage-encrypted API key. Never plaintext. */
  apiKeyEncrypted: string;
};

const PROVIDER_ALLOWED_HOSTS: Record<ModelConfigProvider, readonly string[]> = {
  openrouter: ["openrouter.ai"],
  vilao: ["api.vilao.ai"],
  gpt: ["api.openai.com"],
  gemini: ["generativelanguage.googleapis.com"],
};

export type ModelConfigSaveResult =
  | { ok: true }
  | { ok: false; error: string; retryable: boolean };

export type ModelConfigLoadResult =
  | { ok: true; config: ModelConfig }
  | { ok: true; config: null }
  | { ok: false; error: string };

function configPath(): string {
  return path.join(app.getPath("userData"), CONFIG_FILE);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isModelConfigProvider(value: string): value is ModelConfigProvider {
  return (MODEL_CONFIG_PROVIDERS as readonly string[]).includes(value);
}

function isAllowedModelEndpoint(
  provider: ModelConfigProvider,
  endpoint: string
): boolean {
  try {
    const url = new URL(endpoint.trim());
    if (url.protocol !== "https:") {
      return false;
    }
    if (url.username || url.password) {
      return false;
    }
    if (url.port && url.port !== "443") {
      return false;
    }
    const hostname = url.hostname.toLowerCase();
    return PROVIDER_ALLOWED_HOSTS[provider].includes(hostname);
  } catch {
    return false;
  }
}

/** Validate and normalize a model-config payload from IPC. */
export function parseModelConfigPayload(raw: unknown): ModelConfig | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const provider =
    typeof obj.provider === "string" ? obj.provider.trim() : "";
  const endpoint =
    typeof obj.endpoint === "string" ? obj.endpoint.trim() : "";
  const apiKey = typeof obj.apiKey === "string" ? obj.apiKey.trim() : "";
  const model = typeof obj.model === "string" ? obj.model.trim() : "";

  if (
    !isModelConfigProvider(provider) ||
    !endpoint ||
    !apiKey ||
    !model ||
    !isAllowedModelEndpoint(provider, endpoint)
  ) {
    return null;
  }

  return { provider, endpoint, apiKey, model };
}

function encryptApiKey(apiKey: string): string | null {
  if (!safeStorage.isEncryptionAvailable()) {
    return null;
  }
  try {
    return safeStorage.encryptString(apiKey).toString("base64");
  } catch {
    return null;
  }
}

function decryptApiKey(apiKeyEncrypted: string): string | null {
  if (!safeStorage.isEncryptionAvailable()) {
    return null;
  }
  try {
    const buf = Buffer.from(apiKeyEncrypted, "base64");
    if (buf.length === 0) {
      return null;
    }
    const plain = safeStorage.decryptString(buf);
    const trimmed = plain.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

function parseStoredFile(raw: unknown): StoredModelConfigFile | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const provider =
    typeof obj.provider === "string" ? obj.provider.trim() : "";
  const endpoint =
    typeof obj.endpoint === "string" ? obj.endpoint.trim() : "";
  const model = typeof obj.model === "string" ? obj.model.trim() : "";
  const apiKeyEncrypted =
    typeof obj.apiKeyEncrypted === "string" ? obj.apiKeyEncrypted.trim() : "";

  if (
    !isModelConfigProvider(provider) ||
    !endpoint ||
    !model ||
    !apiKeyEncrypted ||
    !isAllowedModelEndpoint(provider, endpoint)
  ) {
    return null;
  }

  return { provider, endpoint, model, apiKeyEncrypted };
}

function writeAtomic(filePath: string, payload: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, payload, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, filePath);
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Windows may not support POSIX modes; ignore.
  }
}

/** Hard FS failures that will not clear within a short renderer retry window. */
function isRetryableFsError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return true;
  }
  const code = (error as NodeJS.ErrnoException).code;
  if (
    code === "ENOSPC" ||
    code === "EDQUOT" ||
    code === "EACCES" ||
    code === "EPERM" ||
    code === "EROFS"
  ) {
    return false;
  }
  return true;
}

/**
 * Persist validated model config under userData. Encrypts apiKey via safeStorage.
 * Retries transient FS failures. Does not delete a prior good file on failure.
 * Hard failures set retryable: false so the renderer does not re-IPC uselessly.
 */
export async function saveModelConfig(
  input: unknown
): Promise<ModelConfigSaveResult> {
  const config = parseModelConfigPayload(input);
  if (!config) {
    return {
      ok: false,
      error: "Invalid model config.",
      retryable: false,
    };
  }

  const apiKeyEncrypted = encryptApiKey(config.apiKey);
  if (!apiKeyEncrypted) {
    return {
      ok: false,
      error: "OS key encryption is unavailable; cannot persist API key.",
      retryable: false,
    };
  }

  const stored: StoredModelConfigFile = {
    provider: config.provider,
    endpoint: config.endpoint,
    model: config.model,
    apiKeyEncrypted,
  };
  const body = `${JSON.stringify(stored, null, 2)}\n`;
  const filePath = configPath();

  let lastError = "Failed to write model config.";
  let lastRetryable = true;
  for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt++) {
    try {
      writeAtomic(filePath, body);
      console.log("[model-config] persisted");
      return { ok: true };
    } catch (error: unknown) {
      lastError =
        error instanceof Error ? error.message : "Failed to write model config.";
      lastRetryable = isRetryableFsError(error);
      if (!lastRetryable || attempt >= WRITE_ATTEMPTS) {
        break;
      }
      await sleep(WRITE_BACKOFF_MS * attempt);
    }
  }

  console.warn(`[model-config] persist failed: ${lastError}`);
  return {
    ok: false,
    error: "Failed to persist model config.",
    retryable: lastRetryable,
  };
}

/** Load and decrypt durable model config, or null if none. */
export function loadModelConfig(): ModelConfigLoadResult {
  const filePath = configPath();
  if (!fs.existsSync(filePath)) {
    return { ok: true, config: null };
  }

  try {
    const text = fs.readFileSync(filePath, "utf8");
    const stored = parseStoredFile(JSON.parse(text) as unknown);
    if (!stored) {
      console.warn("[model-config] Ignoring invalid model-config.json");
      return { ok: true, config: null };
    }

    const apiKey = decryptApiKey(stored.apiKeyEncrypted);
    if (!apiKey) {
      return {
        ok: false,
        error: "Could not decrypt stored API key.",
      };
    }

    return {
      ok: true,
      config: {
        provider: stored.provider,
        endpoint: stored.endpoint,
        model: stored.model,
        apiKey,
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to read model config.";
    console.warn(`[model-config] load failed: ${message}`);
    return { ok: false, error: "Failed to load model config." };
  }
}
