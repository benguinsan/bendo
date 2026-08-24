"use client";

import {
  BotMessageSquareIcon,
  FolderIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/vital-task", label: "Vital Task", icon: TriangleAlertIcon },
  { href: "/my-task", label: "My Task", icon: ListTodoIcon },
  { href: "/task-categories", label: "Task Categories", icon: FolderIcon },
  { href: "/agent", label: "Agent", icon: BotMessageSquareIcon },
] as const;

type AppNavProps = {
  onNavigate?: () => void;
};

export function AppNav({ onNavigate }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "rounded-card flex h-[59px] max-w-[288px] items-center gap-3 px-6 text-base font-medium",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground"
            )}
          >
            <Icon />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
