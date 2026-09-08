import type { ChatMessage, SendChatTurnResult } from "@/lib/agent/types";

type ApiErrorBody = {
  error: string;
  code?: string;
};

type ApiSuccessBody = {
  data: SendChatTurnResult;
};

export type SendChatTurnClientResult =
  | { ok: true; sessionId: string; reply: ChatMessage }
  | { ok: false; error: string; code?: string };

/**
 * Browser helper: POST /api/agent/chat (never calls dsh directly).
 */
export async function sendChatTurnViaApi(input: {
  message: string;
  sessionId?: string;
}): Promise<SendChatTurnClientResult> {
  try {
    const response = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: input.message,
        sessionId: input.sessionId,
      }),
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        error: `Agent request failed (${response.status}).`,
      };
    }

    if (!response.ok) {
      const body = payload as ApiErrorBody;
      return {
        ok: false,
        error: body.error || `Agent request failed (${response.status}).`,
        code: body.code,
      };
    }

    const body = payload as ApiSuccessBody;
    if (!body.data?.sessionId || !body.data.reply) {
      return { ok: false, error: "Agent response was incomplete." };
    }

    return {
      ok: true,
      sessionId: body.data.sessionId,
      reply: body.data.reply,
    };
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Agent request failed: ${detail}` };
  }
}
