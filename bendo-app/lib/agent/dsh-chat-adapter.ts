import "server-only";
import { randomUUID } from "node:crypto";

import { env } from "@/env";
import type { AgentRuntime } from "@/lib/agent/agent-runtime";
import type { SendChatTurnInput, SendChatTurnResult } from "@/lib/agent/types";
import { fail, ok, type ServiceResult } from "@/lib/supabase/errors";

type BridgeSuccess = {
  sessionId?: unknown;
  replyText?: unknown;
  error?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Server-only adapter: POST to the dsh Doro chat-bridge.
 * Returns null when bridge URL/secret are not configured.
 */
export function createDshChatAdapter(): AgentRuntime | null {
  const url = env.DSH_CHAT_BRIDGE_URL;
  const secret = env.DSH_CHAT_BRIDGE_SECRET;
  if (!url || !secret) {
    return null;
  }

  const timeoutMs = env.DSH_CHAT_TIMEOUT_MS;

  return {
    sendTurn: async (
      input: SendChatTurnInput
    ): Promise<ServiceResult<SendChatTurnResult>> => {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-bendo-chat-secret": secret,
          },
          body: JSON.stringify({
            message: input.message,
            sessionId: input.sessionId,
            clerkToken: input.clerkToken,
          }),
          signal: controller.signal,
        });

        let payload: unknown = null;
        const text = await response.text();
        if (text) {
          try {
            payload = JSON.parse(text) as unknown;
          } catch {
            return fail(
              "AGENT_UNAVAILABLE",
              `Agent bridge returned non-JSON (${response.status}).`
            );
          }
        }

        if (response.status === 504) {
          const message =
            isRecord(payload) && typeof payload.error === "string"
              ? payload.error
              : "Agent turn timed out.";
          return fail("AGENT_TIMEOUT", message);
        }

        if (!response.ok) {
          const message =
            isRecord(payload) && typeof payload.error === "string"
              ? payload.error
              : `Agent bridge failed (${response.status}).`;
          if (response.status === 400) {
            return fail("VALIDATION", message);
          }
          return fail("AGENT_UNAVAILABLE", message);
        }

        if (!isRecord(payload)) {
          return fail(
            "AGENT_UNAVAILABLE",
            "Agent bridge returned an empty body."
          );
        }

        const body = payload as BridgeSuccess;
        if (
          typeof body.sessionId !== "string" ||
          body.sessionId.trim() === ""
        ) {
          return fail(
            "AGENT_UNAVAILABLE",
            "Agent bridge response missing sessionId."
          );
        }
        if (typeof body.replyText !== "string") {
          return fail(
            "AGENT_UNAVAILABLE",
            "Agent bridge response missing replyText."
          );
        }

        return ok({
          sessionId: body.sessionId,
          reply: {
            id: `msg-agent-${randomUUID()}`,
            role: "agent",
            kind: "text",
            createdAt: new Date().toISOString(),
            body: body.replyText,
          },
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return fail("AGENT_TIMEOUT", "Agent turn timed out.");
        }
        const detail = error instanceof Error ? error.message : String(error);
        return fail("AGENT_UNAVAILABLE", `Agent bridge unreachable: ${detail}`);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
