"use client";

import { MenuIcon } from "lucide-react";

import { useMobileMenu } from "@/components/app-shell/mobile-menu-context";
import { Button } from "@/components/ui/button";

export function HeaderMenuButton() {
  const { openMenu } = useMobileMenu();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className="lg:hidden"
      aria-label="Open menu"
      onClick={openMenu}
    >
      <MenuIcon />
    </Button>
  );
}
