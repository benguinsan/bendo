"use client";

import { LogOutIcon } from "lucide-react";

import { AppNav } from "@/components/app-shell/app-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DashboardProfile } from "@/lib/dashboard/mock-data";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  profile: DashboardProfile;
  open: boolean;
  onClose: () => void;
};

export function AppSidebar({ profile, open, onClose }: AppSidebarProps) {
  return (
    <>
      {open ? (
        <button
          type="button"
          className="bg-foreground/20 fixed inset-0 z-20 lg:hidden"
          aria-label="Close menu"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground shadow-sidebar flex w-[18.125rem] shrink-0 flex-col p-6",
          "fixed top-[100px] bottom-0 left-0 z-30 lg:static lg:z-auto lg:flex",
          open ? "flex" : "hidden lg:flex"
        )}
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <Avatar className="after:border-background/40 size-[86px]">
            <AvatarImage src={profile.avatarSrc} alt="" />
            <AvatarFallback>{profile.initials}</AvatarFallback>
          </Avatar>
          <div className="flex w-full flex-col items-center gap-1 text-center">
            <p className="text-base font-semibold">{profile.fullName}</p>
            <p className="text-sidebar-foreground/80 w-full truncate text-xs">
              {profile.email}
            </p>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-6">
          <AppNav onNavigate={onClose} />
          <button
            type="button"
            className="rounded-card text-sidebar-foreground flex h-[59px] max-w-[288px] items-center gap-3 px-6 text-left text-base font-medium"
          >
            <LogOutIcon />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
