import "server-only";
import { clerkClient } from "@clerk/nextjs/server";

export type DiscordConnectionStatus =
  | "connected"
  | "not_connected"
  | "needs_verification"
  /** Clerk OAuth token lookup failed; do not treat as confirmed disconnect. */
  | "lookup_failed";

export type DiscordConnection = {
  status: DiscordConnectionStatus;
  discordUsername: string | null;
  discordUserId: string | null;
};

type DiscordExternalAccount = {
  provider: string;
  username: string | null;
  providerUserId: string;
  verification: { status: string } | null;
};

type DiscordConnectionUser = {
  id: string;
  externalAccounts: DiscordExternalAccount[];
};

type OauthTokenLookup = "present" | "absent" | "error";

function discordIdentity(account: DiscordExternalAccount | undefined): {
  discordUsername: string | null;
  discordUserId: string | null;
} {
  if (!account) {
    return { discordUsername: null, discordUserId: null };
  }

  return {
    discordUsername: account.username?.trim() || null,
    discordUserId: account.providerUserId || null,
  };
}

function isDiscordProvider(provider: string): boolean {
  return provider === "discord" || provider === "oauth_discord";
}

/**
 * Lookup Discord OAuth access token without exposing it.
 * Distinguishes confirmed absence from Clerk API failures.
 */
async function lookupDiscordOauthToken(
  userId: string
): Promise<OauthTokenLookup> {
  try {
    const client = await clerkClient();
    const response = await client.users.getUserOauthAccessToken(
      userId,
      "discord"
    );
    return response.data[0]?.token ? "present" : "absent";
  } catch {
    return "error";
  }
}

/**
 * Resolves Discord link status for Settings.
 * Connected only when Clerk can return a Discord OAuth access token.
 * Never returns the token itself.
 */
export async function getDiscordConnectionStatus(
  user: DiscordConnectionUser
): Promise<DiscordConnection> {
  const discordAccount = user.externalAccounts.find((account) =>
    isDiscordProvider(account.provider)
  );
  const identity = discordIdentity(discordAccount);
  const verificationStatus = discordAccount?.verification?.status;

  if (
    discordAccount &&
    verificationStatus &&
    verificationStatus !== "verified"
  ) {
    return {
      status: "needs_verification",
      ...identity,
    };
  }

  // No Discord external account → confirmed not connected (skip token lookup).
  if (!discordAccount) {
    return {
      status: "not_connected",
      discordUsername: null,
      discordUserId: null,
    };
  }

  const tokenLookup = await lookupDiscordOauthToken(user.id);
  if (tokenLookup === "present") {
    return {
      status: "connected",
      ...identity,
    };
  }

  if (tokenLookup === "error") {
    return {
      status: "lookup_failed",
      ...identity,
    };
  }

  // Token lookup succeeded with no token → confirmed not connected.
  return {
    status: "not_connected",
    discordUsername: null,
    discordUserId: null,
  };
}
