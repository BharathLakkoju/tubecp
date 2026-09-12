"use client";

import { List } from "@phosphor-icons/react";
import { useAppShell } from "@/lib/contexts/AppShellContext";

export default function MobileNavToggle() {
  const { openMobileNav, mobileNavVisible } = useAppShell();

  if (!mobileNavVisible) return null;

  return (
    <button
      type="button"
      className="app-shell-mobile-toggle md:hidden"
      onClick={openMobileNav}
      aria-label="Open navigation"
    >
      <List size={18} weight="bold" />
    </button>
  );
}
