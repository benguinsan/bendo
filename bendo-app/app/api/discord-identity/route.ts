import { requireApiUser } from "@/lib/api/require-api-user";
import { fromServiceResult, unauthorized } from "@/lib/api/respond";
import { deleteDiscordIdentityForClerkUser } from "@/lib/discord/discord-identity-service";

export async function DELETE() {
  const authResult = await requireApiUser();
  if (!authResult.ok) {
    return unauthorized();
  }

  return fromServiceResult(
    await deleteDiscordIdentityForClerkUser(authResult.userId)
  );
}
