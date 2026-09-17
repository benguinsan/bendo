import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DiscordConnection } from "@/lib/auth/discord-connection";
import type { DashboardProfile } from "@/lib/dashboard/task-types";

import { DiscordConnectControls } from "./discord-connect-controls";

type SettingsViewProps = {
  profile: DashboardProfile;
  discord: DiscordConnection;
};

export function SettingsView({ profile, discord }: SettingsViewProps) {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your Bendo profile details.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Name
              </dt>
              <dd className="text-foreground text-sm font-medium">
                {profile.fullName}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Email
              </dt>
              <dd className="text-foreground truncate text-sm font-medium">
                {profile.email || "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discord</CardTitle>
          <CardDescription>
            Connect Discord so Doro can create tasks in Bendo from your Discord
            messages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DiscordConnectControls connection={discord} />
        </CardContent>
      </Card>
    </div>
  );
}
