"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";

type AppShellContextValue = {
  openMobileNav: () => void;
  mobileNavVisible: boolean;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({
  children,
  mobileOpen,
  setMobileOpen,
}: {
  children: ReactNode;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const value = {
    openMobileNav: useCallback(() => setMobileOpen(true), [setMobileOpen]),
    mobileNavVisible: !mobileOpen,
  };

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within AppShell");
  }
  return context;
}
