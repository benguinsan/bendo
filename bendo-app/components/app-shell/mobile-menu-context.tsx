"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type MobileMenuContextValue = {
  openMenu: () => void;
};

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function MobileMenuProvider({
  onOpenMenu,
  children,
}: {
  onOpenMenu: () => void;
  children: ReactNode;
}) {
  const openMenu = useCallback(() => {
    onOpenMenu();
  }, [onOpenMenu]);

  const value = useMemo(() => ({ openMenu }), [openMenu]);

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const value = useContext(MobileMenuContext);
  if (!value) {
    throw new Error("useMobileMenu must be used within MobileMenuProvider");
  }
  return value;
}
