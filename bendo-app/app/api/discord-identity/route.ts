import { currentUser } from "@clerk/nextjs/server";

import { maybeProxyPrivilegedRequest, toMeUser } from "@/lib/api/cloud";
import { requireApiUser } from "@/lib/api/require-api-user";
import { fromServiceResult, unauthorized } from "@/lib/api/respond";
import {
  deleteDiscordIdentityForClerkUser,
  resolveAndSyncDiscordIdentity,
} from "@/lib/discord/discord-identity-service";

/**
 * GET: verify Discord OAuth (Clerk secret), best-effort sync `discord_identities`,
 * return status JSON — same cutover pattern as GET /api/me.
 * Packaged desktop proxies to Vercel; never returns OAuth tokens.
 */
export async function GET(request: Request) {
  const proxied = await maybeProxyPrivilegedRequest(request);
  if (proxied) {
    return proxied;
  }

  const authResult = await requireApiUser(request);
  if (!authResult.ok) {
    return unauthorized();
  }

  const user = await currentUser();
  if (!user || user.id !== authResult.userId) {
    return unauthorized();
  }

  const status = await resolveAndSyncDiscordIdentity(toMeUser(user));
  return Response.json({ data: status });
}

export async function DELETE(request: Request) {
  const proxied = await maybeProxyPrivilegedRequest(request);
  if (proxied) {
    return proxied;
  }

  const authResult = await requireApiUser(request);
  if (!authResult.ok) {
    return unauthorized();
  }

  return fromServiceResult(
    await deleteDiscordIdentityForClerkUser(authResult.userId)
  );
}
