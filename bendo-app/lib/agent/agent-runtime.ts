import "server-only";
import { createDshChatAdapter } from "@/lib/agent/dsh-chat-adapter";
import type {
  ApplyModelConfigInput,
  ApplyModelConfigResult,
  SendChatTurnInput,
  SendChatTurnResult,
} from "@/lib/agent/types";
import { fail, type ServiceResult } from "@/lib/supabase/errors";

export type AgentRuntime = {
  sendTurn: (
    input: SendChatTurnInput
  ) => Promise<ServiceResult<SendChatTurnResult>>;
  applyModelConfig: (
    input: ApplyModelConfigInput
  ) => Promise<ServiceResult<ApplyModelConfigResult>>;
};

/** How long a completed turn stays dedupable for the same clientRequestId. */
const IDEMPOTENCY_TTL_MS = 120_000;

type IdempotencyEntry = {
  promise: Promise<ServiceResult<SendChatTurnResult>>;
  expiresAt: number;
};

const idempotencyCache = new Map<string, IdempotencyEntry>();

const offlineMessage =
  "Agent is offline. Set DSH_CHAT_BRIDGE_URL and DSH_CHAT_BRIDGE_SECRET.";

function pruneIdempotencyCache(now: number) {
  for (const [key, entry] of idempotencyCache) {
    if (entry.expiresAt <= now) {
      idempotencyCache.delete(key);
    }
  }
}

/**
 * Coalesce in-flight and recently completed turns by user + clientRequestId
 * so an aborted POST retry does not start a second bridge turn.
 */
function withClientRequestIdempotency(runtime: AgentRuntime): AgentRuntime {
  return {
    applyModelConfig: (input) => runtime.applyModelConfig(input),
    sendTurn: (input) => {
      const requestId = input.clientRequestId?.trim();
      if (!requestId) {
        return runtime.sendTurn(input);
      }

      const now = Date.now();
      pruneIdempotencyCache(now);

      const key = `${input.userId}:${requestId}`;
      const existing = idempotencyCache.get(key);
      if (existing && existing.expiresAt > now) {
        return existing.promise;
      }

      const promise = (async (): Promise<ServiceResult<SendChatTurnResult>> => {
        try {
          const result = await runtime.sendTurn(input);
          if (result.ok) {
            idempotencyCache.set(key, {
              promise: Promise.resolve(result),
              expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
            });
          } else {
            // Allow a real retry after cancel/timeout/failure.
            idempotencyCache.delete(key);
          }
          return result;
        } catch (error) {
          idempotencyCache.delete(key);
          throw error;
        }
      })();

      idempotencyCache.set(key, {
        promise,
        expiresAt: now + IDEMPOTENCY_TTL_MS,
      });

      return promise;
    },
  };
}

/**
 * Resolve the configured Agent runtime.
 * Missing dsh bridge env yields AGENT_UNAVAILABLE on send (no silent mock AI).
 */
export function getAgentRuntime(): AgentRuntime {
  const adapter = createDshChatAdapter();
  if (!adapter) {
    return {
      sendTurn: () =>
        Promise.resolve(fail("AGENT_UNAVAILABLE", offlineMessage)),
      applyModelConfig: () =>
        Promise.resolve(fail("AGENT_UNAVAILABLE", offlineMessage)),
    };
  }
  return withClientRequestIdempotency(adapter);
}
