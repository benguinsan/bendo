"use client";

import { useState, type ReactNode } from "react";

import { AppHeader } from "@/components/app-shell/app-header";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import type { DashboardProfile } from "@/lib/dashboard/task-types";

type AppShellProps = {
  children: ReactNode;
  profile: DashboardProfile;
  weekday: string;
  numericDate: string;
};

export function AppShell({
  children,
  profile,
  weekday,
  numericDate,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-background flex h-svh flex-col overflow-hidden">
      <AppHeader
        weekday={weekday}
        numericDate={numericDate}
        onMenuClick={() => setMenuOpen(true)}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AppSidebar
          profile={profile}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
