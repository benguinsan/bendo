"use client";

import { useReverification, useUser } from "@clerk/nextjs";
import type {
  CreateExternalAccountParams,
  ExternalAccountResource,
} from "@clerk/nextjs/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { DiscordConnection } from "@/lib/auth/discord-connection";

const SETTINGS_REDIRECT_URL = "/settings";

type DiscordConnectControlsProps = {
  connection: DiscordConnection;
};

function isDiscordProvider(provider: string): boolean {
  return provider === "discord" || provider === "oauth_discord";
}

function statusLabel(
  connection: DiscordConnection,
  hasClerkDiscordAccount: boolean
): string {
  if (connection.status === "connected") {
    if (connection.discordUsername) {
      return `Connected as ${connection.discordUsername}`;
    }
    return "Connected";
  }

  if (connection.status === "needs_verification") {
    return "Verification needed";
  }

  // Clerk still has a Discord link, but OAuth token / server status is stale.
  if (hasClerkDiscordAccount) {
    return "Linked in Clerk — disconnect to reconnect";
  }

  return "Not connected";
}

export function DiscordConnectControls({
  connection,
}: DiscordConnectControlsProps) {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createExternalAccount = useReverification(
    (params: CreateExternalAccountParams) => user?.createExternalAccount(params)
  );
  const destroyAccount = useReverification((account: ExternalAccountResource) =>
    account.destroy()
  );

  const discordAccount = user?.externalAccounts.find((account) =>
    isDiscordProvider(account.provider)
  );
  const hasClerkDiscordAccount = Boolean(discordAccount);
  // Always offer disconnect when Clerk still has the Discord external account,
  // even if server status is not_connected (common after linking before DB sync).
  const showDisconnect =
    hasClerkDiscordAccount || connection.status === "connected";
  const showReverify =
    !showDisconnect && connection.status === "needs_verification";
  const showConnect = !(showDisconnect || showReverify);

  async function connectDiscord() {
    if (!user) {
      return;
    }

    if (discordAccount) {
      setError(
        "Discord is already linked in Clerk. Disconnect first, then connect again."
      );
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await createExternalAccount({
        strategy: "oauth_discord",
        redirectUrl: SETTINGS_REDIRECT_URL,
      });
      const redirectUrl =
        result?.verification?.externalVerificationRedirectURL?.href;
      if (redirectUrl) {
        window.location.assign(redirectUrl);
        return;
      }
      await user.reload();
      router.refresh();
      setBusy(false);
    } catch {
      setError(
        "Could not start Discord connection. If Discord is already linked, disconnect first."
      );
      setBusy(false);
    }
  }

  function reverifyDiscord() {
    const redirectUrl =
      discordAccount?.verification?.externalVerificationRedirectURL?.href;
    if (redirectUrl) {
      window.location.assign(redirectUrl);
      return;
    }
    void connectDiscord();
  }

  async function disconnectDiscord() {
    setBusy(true);
    setError(null);

    try {
      const account =
        discordAccount ??
        user?.externalAccounts.find((item) => isDiscordProvider(item.provider));

      if (account) {
        await destroyAccount(account);
        await user?.reload();
      }

      const response = await fetch("/api/discord-identity", {
        method: "DELETE",
      });
      if (!response.ok) {
        let message = "Could not clear Discord mapping. Try again.";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) {
            message = body.error;
          }
        } catch {
          // keep default message
        }
        setError(message);
        router.refresh();
        setBusy(false);
        return;
      }

      router.refresh();
      setBusy(false);
    } catch {
      setError("Could not disconnect Discord. Try again.");
      setBusy(false);
    }
  }

  const controlsDisabled = !isLoaded || busy || !user;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Status:{" "}
          <span className="text-foreground font-medium">
            {statusLabel(connection, hasClerkDiscordAccount)}
          </span>
        </p>

        {showDisconnect ? (
          <Button
            type="button"
            variant="outline"
            disabled={controlsDisabled}
            onClick={() => {
              void disconnectDiscord();
            }}
          >
            {busy ? "Disconnecting…" : "Disconnect"}
          </Button>
        ) : null}

        {showConnect ? (
          <Button
            type="button"
            disabled={controlsDisabled}
            onClick={() => {
              void connectDiscord();
            }}
          >
            {busy ? "Connecting…" : "Connect Discord"}
          </Button>
        ) : null}

        {showReverify ? (
          <Button
            type="button"
            disabled={controlsDisabled}
            onClick={reverifyDiscord}
          >
            {busy ? "Opening Discord…" : "Reverify Discord"}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
