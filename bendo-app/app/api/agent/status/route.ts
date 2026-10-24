import "server-only";
import { getAgentBridgeStatus } from "@/lib/agent/agent-bridge-status";
import { requireApiUser } from "@/lib/api/require-api-user";
import { unauthorized } from "@/lib/api/respond";

/**
 * Agent readiness for the chat UI (local bridge only).
 * Never proxies to Vercel; never returns secrets.
 */
export async function GET(request: Request) {
  const authResult = await requireApiUser(request);
  if (!authResult.ok) {
    return unauthorized();
  }

  const status = await getAgentBridgeStatus();
  return Response.json(
    { data: status },
    {
      headers: { "cache-control": "no-store" },
    }
  );
}
