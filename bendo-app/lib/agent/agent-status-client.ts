import { z } from "zod";

export type AgentBridgeStatus = {
  bridgeConfigured: boolean;
  bridgeReachable: boolean | null;
};

const statusBodySchema = z.object({
  data: z.object({
    bridgeConfigured: z.boolean(),
    bridgeReachable: z.boolean().nullable(),
  }),
});

export type AgentBridgeStatusClientResult =
  | { ok: true; status: AgentBridgeStatus }
  | { ok: false; error: string };

/** Browser helper: GET /api/agent/status. */
export async function fetchAgentBridgeStatus(
  signal?: AbortSignal
): Promise<AgentBridgeStatusClientResult> {
  try {
    const response = await fetch("/api/agent/status", {
      method: "GET",
      cache: "no-store",
      signal,
    });
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        error: "Couldn’t check Agent status.",
      };
    }
    const parsed = statusBodySchema.safeParse(json);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Couldn’t check Agent status.",
      };
    }
    return { ok: true, status: parsed.data.data };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Status check cancelled." };
    }
    return {
      ok: false,
      error: "Couldn’t check Agent status.",
    };
  }
}
