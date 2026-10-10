import type { Metadata } from "next";

import { PageFrame } from "@/components/app-shell/page-frame";
import { PageHeading } from "@/components/app-shell/page-heading";
import { SettingsView } from "@/components/settings/settings-view";
import { requireUser } from "@/lib/auth/require-user";
import { toDashboardProfile } from "@/lib/auth/to-dashboard-profile";
import { loadDiscordIdentityForSettings } from "@/lib/discord/discord-identity-service";

export const metadata: Metadata = {
  title: "Settings · bendo",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = toDashboardProfile(user);
  // Cloud cutover: GET /api/discord-identity on Vercel (verify + sync).
  // Local secrets: same resolve+sync in-process. Soft-fail sync inside loader/GET.
  const discordStatus = await loadDiscordIdentityForSettings(user);
  const discord = {
    status: discordStatus.status,
    discordUserId: discordStatus.discordUserId,
    discordUsername: discordStatus.discordUsername,
  };

  return (
    <PageFrame>
      <PageHeading>Settings</PageHeading>
      <SettingsView profile={profile} discord={discord} />
    </PageFrame>
  );
}
