import { currentUser } from "@clerk/nextjs/server";

import { maybeProxyPrivilegedRequest, toMeUser } from "@/lib/api/cloud";
import { requireApiUser } from "@/lib/api/require-api-user";
import {
  fromServiceResult,
  jsonError,
  readJsonBody,
  unauthorized,
} from "@/lib/api/respond";
import {
  deleteDiscordIdentityForClerkUser,
  resolveAndSyncDiscordIdentity,
  upsertDiscordIdentity,
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

export async function POST(request: Request) {
  const proxied = await maybeProxyPrivilegedRequest(request);
  if (proxied) {
    return proxied;
  }

  const authResult = await requireApiUser(request);
  if (!authResult.ok) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Invalid JSON body", "VALIDATION");
  }

  const discordUserId =
    typeof body.body === "object" &&
    body.body !== null &&
    "discordUserId" in body.body &&
    typeof (body.body as { discordUserId: unknown }).discordUserId === "string"
      ? (body.body as { discordUserId: string }).discordUserId
      : null;

  if (!discordUserId?.trim()) {
    return jsonError(400, "discordUserId is required.", "VALIDATION");
  }

  return fromServiceResult(
    await upsertDiscordIdentity(authResult.userId, discordUserId)
  );
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
