import "server-only";
import type { DiscordConnection } from "@/lib/auth/discord-connection";
import type { Tables } from "@/lib/supabase/database.types";
import {
  fail,
  mapSupabaseError,
  ok,
  type ServiceResult,
} from "@/lib/supabase/errors";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type DiscordIdentity = {
  clerkUserId: string;
  discordUserId: string;
};

type DiscordIdentityRow = Tables<"discord_identities">;

function toDiscordIdentity(row: DiscordIdentityRow): DiscordIdentity {
  return {
    clerkUserId: row.clerk_user_id,
    discordUserId: row.discord_user_id,
  };
}

export async function upsertDiscordIdentity(
  clerkUserId: string,
  discordUserId: string
): Promise<ServiceResult<DiscordIdentity>> {
  const clerkId = clerkUserId.trim();
  const discordId = discordUserId.trim();

  if (!clerkId || !discordId) {
    return fail("VALIDATION", "Clerk and Discord ids are required.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("discord_identities")
    .upsert(
      {
        clerk_user_id: clerkId,
        discord_user_id: discordId,
      },
      { onConflict: "clerk_user_id" }
    )
    .select("*")
    .single();

  if (error) {
    return mapSupabaseError(error);
  }

  return ok(toDiscordIdentity(data));
}

export async function deleteDiscordIdentityForClerkUser(
  clerkUserId: string
): Promise<ServiceResult<{ deleted: boolean }>> {
  const clerkId = clerkUserId.trim();
  if (!clerkId) {
    return fail("VALIDATION", "Clerk user id is required.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("discord_identities")
    .delete()
    .eq("clerk_user_id", clerkId)
    .select("id");

  if (error) {
    return mapSupabaseError(error);
  }

  return ok({ deleted: (data?.length ?? 0) > 0 });
}

/**
 * Keep `discord_identities` aligned with Clerk Discord link status on Settings.
 * Does not upsert or delete while status is `needs_verification`.
 */
export function syncDiscordIdentityForSettings(
  clerkUserId: string,
  connection: DiscordConnection
): Promise<ServiceResult<DiscordIdentity | { deleted: boolean } | null>> {
  if (connection.status === "connected") {
    if (!connection.discordUserId) {
      return Promise.resolve(
        fail(
          "VALIDATION",
          "Connected Discord account is missing a Discord user id."
        )
      );
    }
    return upsertDiscordIdentity(clerkUserId, connection.discordUserId);
  }

  if (connection.status === "not_connected") {
    return deleteDiscordIdentityForClerkUser(clerkUserId);
  }

  return Promise.resolve(ok(null));
}
