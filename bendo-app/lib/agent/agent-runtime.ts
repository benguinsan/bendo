import "server-only";
import { createDshChatAdapter } from "@/lib/agent/dsh-chat-adapter";
import type { SendChatTurnInput, SendChatTurnResult } from "@/lib/agent/types";
import { fail, type ServiceResult } from "@/lib/supabase/errors";

export type AgentRuntime = {
  sendTurn: (
    input: SendChatTurnInput
  ) => Promise<ServiceResult<SendChatTurnResult>>;
};

/**
 * Resolve the configured Agent runtime.
 * Missing dsh bridge env yields AGENT_UNAVAILABLE on send (no silent mock AI).
 */
export function getAgentRuntime(): AgentRuntime {
  const adapter = createDshChatAdapter();
  if (!adapter) {
    return {
      sendTurn: () =>
        Promise.resolve(
          fail(
            "AGENT_UNAVAILABLE",
            "Agent is offline. Set DSH_CHAT_BRIDGE_URL and DSH_CHAT_BRIDGE_SECRET."
          )
        ),
    };
  }
  return adapter;
}
