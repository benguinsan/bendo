import { maybeProxyPrivilegedRequest } from "@/lib/api/cloud-privilege";
import { requireApiUser } from "@/lib/api/require-api-user";
import {
  fromServiceResult,
  jsonError,
  readJsonBody,
  unauthorized,
} from "@/lib/api/respond";
import {
  deleteDiscordIdentityForClerkUser,
  upsertDiscordIdentity,
} from "@/lib/discord/discord-identity-service";

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
