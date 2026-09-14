"use client";

import { useCallback, useState, type ReactNode } from "react";

import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { MobileMenuProvider } from "@/components/app-shell/mobile-menu-context";
import type { DashboardProfile } from "@/lib/dashboard/task-types";

type AppShellProps = {
  children: ReactNode;
  header: ReactNode;
  profile: DashboardProfile;
};

export function AppShell({ children, header, profile }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = useCallback(() => {
    setMenuOpen(true);
  }, []);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <MobileMenuProvider onOpenMenu={openMenu}>
      <div className="bg-background flex h-svh flex-col overflow-hidden">
        {header}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <AppSidebar profile={profile} open={menuOpen} onClose={closeMenu} />
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </MobileMenuProvider>
  );
}
