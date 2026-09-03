"use client";

import { CalendarDaysIcon, MenuIcon } from "lucide-react";
import Link from "next/link";

import { HeaderSearch } from "@/components/app-shell/header-search";
import { NotificationsPopover } from "@/components/app-shell/notifications-popover";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  weekday: string;
  numericDate: string;
  onMenuClick: () => void;
};

/**
 * Main application header with menu button, logo, search, notifications, calendar, and date display.
 */
export function AppHeader({
  weekday,
  numericDate,
  onMenuClick,
}: AppHeaderProps) {
  return (
    <header className="bg-secondary shadow-header flex h-[100px] shrink-0 items-center gap-4 px-4 sm:px-8 lg:px-12">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="lg:hidden"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        <MenuIcon />
      </Button>
      <Link
        href="/"
        className="shrink-0 text-[28px] leading-normal font-semibold sm:text-[32px]"
      >
        <span className="text-primary">Dash</span>
        <span className="text-foreground hidden sm:inline">board</span>
      </Link>
      <div className="flex min-w-0 flex-1 justify-center">
        <HeaderSearch />
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <NotificationsPopover />
        <Button
          nativeButton={false}
          render={<Link href="/calendar" />}
          size="icon-lg"
          aria-label="Open calendar"
        >
          <CalendarDaysIcon />
        </Button>
        <div className="hidden text-right sm:block">
          <p className="text-foreground text-[15px] font-medium">{weekday}</p>
          <p className="text-date-accent text-sm font-medium">{numericDate}</p>
        </div>
      </div>
    </header>
  );
}
