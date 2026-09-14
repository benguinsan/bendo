import { CalendarDaysIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { HeaderMenuButton } from "@/components/app-shell/header-menu-button";
import { HeaderSearch } from "@/components/app-shell/header-search";
import { NotificationsPopover } from "@/components/app-shell/notifications-popover";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  dateDisplay: ReactNode;
};

/**
 * Main application header — Server Component with small client islands
 * (menu button, search, notifications).
 */
export function AppHeader({ dateDisplay }: AppHeaderProps) {
  return (
    <header className="bg-secondary shadow-header flex h-[100px] shrink-0 items-center gap-4 px-4 sm:px-8 lg:px-12">
      <HeaderMenuButton />
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
        <Link
          href="/calendar"
          aria-label="Open calendar"
          className={cn(buttonVariants({ size: "icon-lg" }))}
        >
          <CalendarDaysIcon />
        </Link>
        {dateDisplay}
      </div>
    </header>
  );
}
