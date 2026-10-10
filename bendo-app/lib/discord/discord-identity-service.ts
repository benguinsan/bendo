import "server-only";
import {
  cloudDeleteDiscordIdentity,
  cloudUpsertDiscordIdentity,
  isCloudSupabaseMode,
} from "@/lib/api/cloud";
import { cloudGetDiscordIdentity } from "@/lib/api/cloud/privilege-loaders";
import {
  type DiscordConnection,
  type DiscordConnectionUser,
  type DiscordIdentityStatus,
  getDiscordConnectionStatus,
} from "@/lib/auth/discord-connection";
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

export type { DiscordIdentityStatus } from "@/lib/auth/discord-connection";

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

  if (!(clerkId && discordId)) {
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
 * Keep `discord_identities` aligned with Clerk Discord link status.
 * - `connected`: upsert mapping
 * - `not_connected`: delete mapping (Clerk confirmed absent)
 * - `needs_verification` / `lookup_failed`: leave mapping unchanged
 *
 * Local secrets: writes via service role. Cloud Supabase mode: POST/DELETE via
 * `fetchCloudApi` (used only if callers still sync without GET). Prefer
 * `resolveAndSyncDiscordIdentity` / `loadDiscordIdentityForSettings` for Settings.
 */
export function syncDiscordIdentityForSettings(
  clerkUserId: string,
  connection: DiscordConnection
): Promise<ServiceResult<DiscordIdentity | { deleted: boolean } | null>> {
  if (isCloudSupabaseMode()) {
    void clerkUserId;
    if (connection.status === "connected") {
      if (!connection.discordUserId) {
        return Promise.resolve(
          fail(
            "VALIDATION",
            "Connected Discord account is missing a Discord user id."
          )
        );
      }
      return cloudUpsertDiscordIdentity(connection.discordUserId);
    }

    if (connection.status === "not_connected") {
      return cloudDeleteDiscordIdentity();
    }

    return Promise.resolve(ok(null));
  }

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

/**
 * Resolve Clerk Discord link, best-effort sync `discord_identities`, return status JSON.
 * Runs on a host with Clerk + Supabase secrets (Vercel or local full `.env`).
 * Sync failures do not fail the read — same soft behavior as Settings used to.
 */
export async function resolveAndSyncDiscordIdentity(
  user: DiscordConnectionUser
): Promise<DiscordIdentityStatus> {
  const connection = await getDiscordConnectionStatus(user);

  // Soft-fail sync: status is still returned for UI even if DB write fails.
  const syncResult = await syncDiscordIdentityForSettings(user.id, connection);
  if (!syncResult.ok) {
    console.warn(
      `[discord-identity] mapping sync soft-failed: ${syncResult.message}`
    );
  }

  return {
    clerkUserId: user.id,
    status: connection.status,
    discordUserId: connection.discordUserId,
    discordUsername: connection.discordUsername,
  };
}

/**
 * Settings loader: cloud cutover proxies GET /api/discord-identity (verify+sync on
 * Vercel). Local secrets run resolve+sync in-process (same logic as GET handler).
 */
export function loadDiscordIdentityForSettings(
  user: DiscordConnectionUser
): Promise<DiscordIdentityStatus> {
  if (isCloudSupabaseMode()) {
    return cloudGetDiscordIdentity();
  }
  return resolveAndSyncDiscordIdentity(user);
}
