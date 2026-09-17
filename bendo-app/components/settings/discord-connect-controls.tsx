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

function statusLabel(connection: DiscordConnection): string {
  if (connection.status === "connected") {
    if (connection.discordUsername) {
      return `Connected as ${connection.discordUsername}`;
    }
    return "Connected";
  }

  if (connection.status === "needs_verification") {
    return "Verification needed";
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

  const discordAccount = user?.externalAccounts.find(
    (account) => account.provider === "discord"
  );

  async function connectDiscord() {
    if (!user) {
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
      router.refresh();
      setBusy(false);
    } catch {
      setError("Could not start Discord connection. Try again.");
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
    if (!discordAccount) {
      setError("Discord account not found. Refresh and try again.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await destroyAccount(discordAccount);
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
            {statusLabel(connection)}
          </span>
        </p>

        {connection.status === "connected" ? (
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

        {connection.status === "not_connected" ? (
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

        {connection.status === "needs_verification" ? (
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
