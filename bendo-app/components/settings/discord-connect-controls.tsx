"use client";

import { useReverification, useUser } from "@clerk/nextjs";
import type {
  CreateExternalAccountParams,
  ExternalAccountResource,
} from "@clerk/nextjs/types";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { DiscordConnection } from "@/lib/auth/discord-connection";
import {
  buildDesktopHandoffUrl,
  resolveDesktopAppOrigin,
} from "@/lib/desktop/desktop-handoff";
import { tryOpenExternalUrl } from "@/lib/desktop/open-external";
import { useDesktopFocusRefresh } from "@/lib/desktop/use-desktop-focus-refresh";

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

  if (connection.status === "lookup_failed") {
    return "Unable to verify Discord link";
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
  const [browserHint, setBrowserHint] = useState<string | null>(null);
  const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);

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

  const refreshAfterBrowserOAuth = useCallback(() => {
    void (async () => {
      try {
        await user?.reload();
      } catch {
        // ignore — router refresh still reloads server status
      }
      router.refresh();
    })();
  }, [router, user]);

  useDesktopFocusRefresh(refreshAfterBrowserOAuth);

  async function openOAuthUrl(redirectUrl: string): Promise<void> {
    const openedExternal = await tryOpenExternalUrl(redirectUrl);
    if (openedExternal) {
      setBrowserHint(
        "Complete Discord authorization in your browser, then return to Bendo."
      );
      setBusy(false);
      return;
    }
    window.location.assign(redirectUrl);
  }

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
    setBrowserHint(null);

    try {
      // Electron: absolute local handoff → bendo:// (avoid Clerk landing on Vercel).
      // Web: relative /settings is fine.
      let clerkReturnUrl = "/settings";
      const origin = await resolveDesktopAppOrigin();
      if (origin) {
        clerkReturnUrl = buildDesktopHandoffUrl(origin, "/settings");
      }

      const result = await createExternalAccount({
        strategy: "oauth_discord",
        redirectUrl: clerkReturnUrl,
      });
      const providerOAuthUrl =
        result?.verification?.externalVerificationRedirectURL?.href;
      if (providerOAuthUrl) {
        await openOAuthUrl(providerOAuthUrl);
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

  async function reverifyDiscord() {
    const redirectUrl =
      discordAccount?.verification?.externalVerificationRedirectURL?.href;
    if (redirectUrl) {
      setBusy(true);
      setError(null);
      setBrowserHint(null);
      await openOAuthUrl(redirectUrl);
      return;
    }
    void connectDiscord();
  }

  async function disconnectDiscord() {
    setBusy(true);
    setError(null);
    setBrowserHint(null);

    try {
      const account =
        discordAccount ??
        user?.externalAccounts.find((item) => isDiscordProvider(item.provider));

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
        setConfirmDisconnectOpen(false);
        router.refresh();
        setBusy(false);
        return;
      }

      if (account) {
        await destroyAccount(account);
        await user?.reload();
      }

      setConfirmDisconnectOpen(false);
      router.refresh();
      setBusy(false);
    } catch {
      setError("Could not disconnect Discord. Try again.");
      setConfirmDisconnectOpen(false);
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
              setConfirmDisconnectOpen(true);
            }}
          >
            Disconnect
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
            onClick={() => {
              void reverifyDiscord();
            }}
          >
            {busy ? "Opening Discord…" : "Reverify Discord"}
          </Button>
        ) : null}
      </div>

      {browserHint ? (
        <output className="text-muted-foreground block text-sm">
          {browserHint}
        </output>
      ) : null}

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <AlertDialog
        open={confirmDisconnectOpen}
        onOpenChange={(nextOpen) => {
          if (busy && !nextOpen) {
            return;
          }
          setConfirmDisconnectOpen(nextOpen);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Discord?</AlertDialogTitle>
            <AlertDialogDescription>
              Bendo will unlink Discord from your account and clear the identity
              mapping. You can connect again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void disconnectDiscord();
              }}
            >
              {busy ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
