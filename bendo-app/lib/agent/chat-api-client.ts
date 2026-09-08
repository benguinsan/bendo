import { z } from "zod";

import type { ChatMessage } from "@/lib/agent/types";

type ApiErrorBody = {
  error: string;
  code?: string;
};

const chatMessageSchema = z.object({
  id: z.string().trim().min(1),
  role: z.enum(["agent", "user"]),
  kind: z.literal("text"),
  createdAt: z
    .string()
    .trim()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value))),
  body: z.string(),
});

const sendChatTurnSuccessSchema = z.object({
  data: z.object({
    sessionId: z.string().trim().min(1),
    reply: chatMessageSchema,
  }),
});

export type SendChatTurnClientResult =
  | { ok: true; sessionId: string; reply: ChatMessage; clientRequestId: string }
  | {
      ok: false;
      error: string;
      code?: string;
      clientRequestId: string;
    };

/** Client-side upper bound; keep in sync with server DSH_CHAT_TIMEOUT_MS default. */
const CLIENT_CHAT_TIMEOUT_MS = 120_000;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

/**
 * Browser helper: POST /api/agent/chat (never calls dsh directly).
 * Uses a bounded timeout and optional caller AbortSignal; both the fetch and
 * response-body read settle when aborted. Pass the same `clientRequestId` on
 * retry so the server can dedupe an aborted POST.
 */
export async function sendChatTurnViaApi(input: {
  message: string;
  sessionId?: string;
  /** Abort this turn (e.g. user cancel or unmount). */
  signal?: AbortSignal;
  /** Stable id for this turn; reuse on retry after abort/timeout. */
  clientRequestId?: string;
}): Promise<SendChatTurnClientResult> {
  const clientRequestId = input.clientRequestId ?? crypto.randomUUID();
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, CLIENT_CHAT_TIMEOUT_MS);

  const onExternalAbort = () => {
    controller.abort();
  };

  if (input.signal) {
    if (input.signal.aborted) {
      controller.abort();
    } else {
      input.signal.addEventListener("abort", onExternalAbort, { once: true });
    }
  }

  try {
    const response = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: input.message,
        sessionId: input.sessionId,
        clientRequestId,
      }),
      signal: controller.signal,
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error: unknown) {
      if (isAbortError(error)) {
        throw error;
      }
      return {
        ok: false,
        error: `Agent request failed (${response.status}).`,
        clientRequestId,
      };
    }

    if (!response.ok) {
      const body = payload as ApiErrorBody;
      return {
        ok: false,
        error: body.error || `Agent request failed (${response.status}).`,
        code: body.code,
        clientRequestId,
      };
    }

    const parsed = sendChatTurnSuccessSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Agent response was incomplete.",
        clientRequestId,
      };
    }

    return {
      ok: true,
      sessionId: parsed.data.data.sessionId,
      reply: parsed.data.data.reply,
      clientRequestId,
    };
  } catch (error: unknown) {
    if (isAbortError(error)) {
      if (input.signal?.aborted) {
        return {
          ok: false,
          error: "Request cancelled.",
          code: "ABORTED",
          clientRequestId,
        };
      }
      return {
        ok: false,
        error: "Agent request timed out.",
        code: "AGENT_TIMEOUT",
        clientRequestId,
      };
    }
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Agent request failed: ${detail}`,
      clientRequestId,
    };
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", onExternalAbort);
  }
}
