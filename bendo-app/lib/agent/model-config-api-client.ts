import { z } from "zod";

import type { ModelApiProvider } from "@/lib/agent/model-api-key";

type ApiErrorBody = {
  error: string;
  code?: string;
};

const applySuccessSchema = z.object({
  data: z.object({
    ok: z.literal(true),
  }),
});

export type ApplyModelConfigClientResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

/**
 * Browser helper: POST /api/agent/model-config (Next applies via harness bridge).
 * Never calls the bridge or provider from the browser.
 */
export async function applyModelConfigViaApi(input: {
  provider: ModelApiProvider;
  endpoint: string;
  apiKey: string;
  model: string;
  signal?: AbortSignal;
}): Promise<ApplyModelConfigClientResult> {
  try {
    const response = await fetch("/api/agent/model-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: input.provider,
        endpoint: input.endpoint,
        apiKey: input.apiKey,
        model: input.model,
      }),
      signal: input.signal,
    });

    const json: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const errorBody = json as ApiErrorBody | null;
      return {
        ok: false,
        error:
          typeof errorBody?.error === "string" && errorBody.error.trim()
            ? errorBody.error
            : "Không áp dụng được model config.",
        code: typeof errorBody?.code === "string" ? errorBody.code : undefined,
      };
    }

    const success = applySuccessSchema.safeParse(json);
    if (success.success) {
      return { ok: true };
    }

    return {
      ok: false,
      error: "Không áp dụng được model config.",
      code: "AGENT_UNAVAILABLE",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: "Không áp dụng được model config.",
        code: "ABORTED",
      };
    }
    return {
      ok: false,
      error: "Không áp dụng được model config.",
      code: "AGENT_UNAVAILABLE",
    };
  }
}
