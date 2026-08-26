import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { requireUser } from "@/lib/auth/require-user";
import { toDashboardProfile } from "@/lib/auth/to-dashboard-profile";
import { formatNumericDate, formatWeekday } from "@/lib/dashboard/dates";

export const dynamic = "force-dynamic";

export default async function AppGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await requireUser();
  const now = new Date();

  return (
    <AppShell
      profile={toDashboardProfile(user)}
      weekday={formatWeekday(now)}
      numericDate={formatNumericDate(now)}
    >
      {children}
    </AppShell>
  );
}
