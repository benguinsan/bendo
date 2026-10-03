import { z } from "zod";

import type { ModelApiProvider } from "@/lib/agent/model-api-key";

type ApiErrorBody = {
  error: string;
  code?: string;
};

const probeSuccessSchema = z.object({
  data: z.object({
    ok: z.literal(true),
  }),
});

const probeFailureSchema = z.object({
  data: z.object({
    ok: z.literal(false),
    error: z.string().trim().min(1),
    code: z.string().trim().min(1).optional(),
  }),
});

export type TestModelConnectionResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

/**
 * Browser helper: POST /api/agent/model-connection (Next probes the provider).
 * Never calls the provider from the browser.
 */
export async function testModelConnectionViaApi(input: {
  provider: ModelApiProvider;
  endpoint: string;
  apiKey: string;
  model: string;
  signal?: AbortSignal;
}): Promise<TestModelConnectionResult> {
  try {
    const response = await fetch("/api/agent/model-connection", {
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
            : "Không kết nối được tới endpoint",
        code: typeof errorBody?.code === "string" ? errorBody.code : undefined,
      };
    }

    const success = probeSuccessSchema.safeParse(json);
    if (success.success) {
      return { ok: true };
    }

    const failure = probeFailureSchema.safeParse(json);
    if (failure.success) {
      return {
        ok: false,
        error: failure.data.data.error,
        code: failure.data.data.code,
      };
    }

    return {
      ok: false,
      error: "Không kết nối được tới endpoint",
      code: "UNREACHABLE",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: "Không kết nối được tới endpoint",
        code: "UNREACHABLE",
      };
    }
    return {
      ok: false,
      error: "Không kết nối được tới endpoint",
      code: "UNREACHABLE",
    };
  }
}
