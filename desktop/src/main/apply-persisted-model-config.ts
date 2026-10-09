import { isSmokeMode } from "./bendo-url";
import { getBridgeCredentials } from "./bridge-credentials";
import { loadModelConfig } from "./model-config-store";

const APPLY_TIMEOUT_MS = 15_000;
const APPLY_ATTEMPTS = 3;
const APPLY_BACKOFF_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type BridgeApplyOutcome =
  | { kind: "ok" }
  | { kind: "validation"; detail: string }
  | { kind: "transient"; detail: string };

async function postApplyOnce(): Promise<BridgeApplyOutcome> {
  const loaded = loadModelConfig();
  if (!loaded.ok) {
    return { kind: "transient", detail: loaded.error };
  }
  if (!loaded.config) {
    return { kind: "ok" };
  }

  const { url, secret } = getBridgeCredentials();
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, APPLY_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-bendo-chat-secret": secret,
      },
      body: JSON.stringify({
        action: "applyModelConfig",
        provider: loaded.config.provider,
        endpoint: loaded.config.endpoint,
        apiKey: loaded.config.apiKey,
        model: loaded.config.model,
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    let message = `bridge ${response.status}`;
    try {
      const parsed: unknown = JSON.parse(text);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as { error?: unknown }).error === "string"
      ) {
        message = (parsed as { error: string }).error;
      }
    } catch {
      // non-JSON body; keep status message
    }

    if (response.ok) {
      return { kind: "ok" };
    }
    if (response.status === 400) {
      return { kind: "validation", detail: message };
    }
    return { kind: "transient", detail: message };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return { kind: "transient", detail: "apply timed out" };
    }
    const detail = error instanceof Error ? error.message : String(error);
    return { kind: "transient", detail };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * After harness is ready: re-apply durable model config to the localhost bridge.
 * Soft-fail — never throws to the UI/load path. Skips smoke mode and missing file.
 */
export async function reapplyPersistedModelConfig(): Promise<void> {
  if (isSmokeMode()) {
    return;
  }

  const loaded = loadModelConfig();
  if (!loaded.ok) {
    console.warn(`[model-config] re-apply skipped: ${loaded.error}`);
    return;
  }
  if (!loaded.config) {
    return;
  }

  for (let attempt = 1; attempt <= APPLY_ATTEMPTS; attempt++) {
    const outcome = await postApplyOnce();
    if (outcome.kind === "ok") {
      console.log("[model-config] re-apply ok");
      return;
    }
    if (outcome.kind === "validation") {
      console.warn(
        `[model-config] re-apply rejected (no retry): ${outcome.detail}`
      );
      return;
    }
    if (attempt < APPLY_ATTEMPTS) {
      console.warn(
        `[model-config] re-apply attempt ${attempt} failed (${outcome.detail}); retrying…`
      );
      await sleep(APPLY_BACKOFF_MS * attempt);
      continue;
    }
    console.warn(
      `[model-config] re-apply failed after ${APPLY_ATTEMPTS} attempts: ${outcome.detail}`
    );
  }
}
