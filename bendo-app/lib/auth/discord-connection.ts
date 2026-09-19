import "server-only";
import { clerkClient } from "@clerk/nextjs/server";

export type DiscordConnectionStatus =
  | "connected"
  | "not_connected"
  | "needs_verification";

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

async function hasDiscordOauthToken(userId: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    const response = await client.users.getUserOauthAccessToken(
      userId,
      "discord"
    );
    const token = response.data[0]?.token;
    return Boolean(token);
  } catch {
    return false;
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
  const discordAccount = user.externalAccounts.find(
    (account) =>
      account.provider === "discord" || account.provider === "oauth_discord"
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

  const connected = await hasDiscordOauthToken(user.id);
  if (connected) {
    return {
      status: "connected",
      ...identity,
    };
  }

  return {
    status: "not_connected",
    discordUsername: null,
    discordUserId: null,
  };
}
