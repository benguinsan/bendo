import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { formatNumericDate, formatWeekday } from "@/lib/dashboard/dates";
import { mockProfile } from "@/lib/dashboard/mock-data";

export const dynamic = "force-dynamic";

export default function AppGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const now = new Date();

  return (
    <AppShell
      profile={mockProfile}
      weekday={formatWeekday(now)}
      numericDate={formatNumericDate(now)}
    >
      {children}
    </AppShell>
  );
}
