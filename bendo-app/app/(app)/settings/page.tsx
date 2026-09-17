import type { Metadata } from "next";

import { PageFrame } from "@/components/app-shell/page-frame";
import { PageHeading } from "@/components/app-shell/page-heading";
import { SettingsView } from "@/components/settings/settings-view";
import { getDiscordConnectionStatus } from "@/lib/auth/discord-connection";
import { requireUser } from "@/lib/auth/require-user";
import { toDashboardProfile } from "@/lib/auth/to-dashboard-profile";

export const metadata: Metadata = {
  title: "Settings · bendo",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = toDashboardProfile(user);
  const discord = await getDiscordConnectionStatus(user);

  return (
    <PageFrame>
      <PageHeading>Settings</PageHeading>
      <SettingsView profile={profile} discord={discord} />
    </PageFrame>
  );
}
