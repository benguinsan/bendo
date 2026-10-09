import {
  isAllowedModelEndpoint,
  isModelApiProvider,
  type StoredModelApiKey,
} from "@/lib/agent/model-api-key";

const PERSIST_ATTEMPTS = 3;

/** True when Electron preload exposes durable model-config IPC. */
export function hasDesktopModelConfigPersist(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.bendoDesktop?.saveModelConfig)
  );
}

function parseDesktopConfig(
  raw: {
    provider: string;
    endpoint: string;
    apiKey: string;
    model: string;
  } | null
): StoredModelApiKey | null {
  if (!raw) {
    return null;
  }
  if (!isModelApiProvider(raw.provider)) {
    return null;
  }
  const endpoint = raw.endpoint.trim();
  const apiKey = raw.apiKey.trim();
  const model = raw.model.trim();
  if (
    !endpoint ||
    !apiKey ||
    !model ||
    !isAllowedModelEndpoint(raw.provider, endpoint)
  ) {
    return null;
  }
  return {
    provider: raw.provider,
    endpoint,
    apiKey,
    model,
  };
}

/**
 * Load durable config from Electron main when available.
 * Returns null when not in desktop, missing file, or load failed (soft).
 */
export async function loadDesktopModelConfig(): Promise<StoredModelApiKey | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const api = window.bendoDesktop;
  if (!api?.loadModelConfig) {
    return null;
  }

  try {
    const result = await api.loadModelConfig();
    if (result.ok && result.config) {
      return parseDesktopConfig(result.config);
    }
    return null;
  } catch {
    return null;
  }
}

export type PersistDesktopModelConfigResult =
  | { ok: true }
  | { ok: false; error: string };

async function persistOnce(
  api: NonNullable<Window["bendoDesktop"]>,
  payload: {
    provider: string;
    endpoint: string;
    apiKey: string;
    model: string;
  }
): Promise<PersistDesktopModelConfigResult> {
  try {
    const result = await api.saveModelConfig(payload);
    if (result.ok) {
      return { ok: true };
    }
    return {
      ok: false,
      error: result.error || "Không lưu được cấu hình trên máy.",
    };
  } catch {
    return { ok: false, error: "Không lưu được cấu hình trên máy." };
  }
}

async function persistWithRetry(
  api: NonNullable<Window["bendoDesktop"]>,
  payload: {
    provider: string;
    endpoint: string;
    apiKey: string;
    model: string;
  },
  attempt: number
): Promise<PersistDesktopModelConfigResult> {
  const result = await persistOnce(api, payload);
  if (result.ok || attempt >= PERSIST_ATTEMPTS) {
    return result;
  }
  return persistWithRetry(api, payload, attempt + 1);
}

/**
 * Persist after a successful harness apply. Bounded retries for transient IPC/FS failures.
 */
export async function persistDesktopModelConfig(
  config: StoredModelApiKey
): Promise<PersistDesktopModelConfigResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Desktop persist is unavailable." };
  }
  const api = window.bendoDesktop;
  if (api?.saveModelConfig) {
    return await persistWithRetry(
      api,
      {
        provider: config.provider,
        endpoint: config.endpoint.trim(),
        apiKey: config.apiKey.trim(),
        model: config.model.trim(),
      },
      1
    );
  }
  return { ok: false, error: "Desktop persist is unavailable." };
}
