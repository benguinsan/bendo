import "server-only";
import { env } from "@/env";

const BRIDGE_PROBE_TIMEOUT_MS = 2000;

export type AgentBridgeStatus = {
  bridgeConfigured: boolean;
  /** null when not configured (probe skipped). */
  bridgeReachable: boolean | null;
};

/** Auth / missing-route — process may answer, but chat will fail the same way. */
const UNREACHABLE_PROBE_STATUSES = new Set([401, 403, 404]);

/**
 * Local Agent bridge readiness for UI (no secrets returned).
 * Reachability: HTTP response means the process answered, except 401/403/404
 * (rejected probe treated as unreachable). Other statuses (e.g. 400 bad body)
 * still count as up.
 */
export async function getAgentBridgeStatus(): Promise<AgentBridgeStatus> {
  const url = env.DSH_CHAT_BRIDGE_URL?.trim();
  const secret = env.DSH_CHAT_BRIDGE_SECRET?.trim();
  if (!url || !secret) {
    return { bridgeConfigured: false, bridgeReachable: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, BRIDGE_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-bendo-chat-secret": secret,
      },
      // Probe only — invalid body is fine if the process answers.
      body: JSON.stringify({ action: "bendoStatusProbe" }),
      signal: controller.signal,
    });
    if (UNREACHABLE_PROBE_STATUSES.has(response.status)) {
      return { bridgeConfigured: true, bridgeReachable: false };
    }
    return { bridgeConfigured: true, bridgeReachable: true };
  } catch {
    return { bridgeConfigured: true, bridgeReachable: false };
  } finally {
    clearTimeout(timer);
  }
}
