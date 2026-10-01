import "server-only";
import { resolveAuthedUserId } from "@/lib/api/cloud";

export async function requireApiUser(request?: Request) {
  const userId = await resolveAuthedUserId(request);

  if (!userId) {
    return { ok: false as const };
  }

  return { ok: true as const, userId };
}
