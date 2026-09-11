"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { AppSignedIn, AppSignedOut, AppSignOutButton, AppUserButton } from "@/components/AuthShell";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Wordmark from "@/components/Wordmark";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { cn } from "@/lib/cn";

interface Props {
  variant?: "landing" | "app";
  onReset?: () => void;
  showNewResearch?: boolean;
}

const mobileItem =
  "block w-full border-0 border-b border-border px-4 py-3.5 text-left font-mono text-[13px] font-medium no-underline";

export default function SiteNav({
  variant = "landing",
  onReset,
  showNewResearch,
}: Props) {
  const sub = useSubscription();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleReset = () => {
    onReset?.();
    closeMenu();
  };

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link
          href={variant === "app" ? "/app" : "/"}
          className="shrink-0 no-underline"
          onClick={() => {
            onReset?.();
            closeMenu();
          }}
        >
          <Wordmark size="sm" />
        </Link>

        <nav className="hidden min-w-0 items-center gap-3 md:flex" aria-label="Main">
          <div className="nav-tabs">
            {variant === "landing" && (
              <Link href="/#features" className="nav-tab">
                features
              </Link>
            )}
            <Link href="/pricing" className="nav-tab">
              pricing
            </Link>
          </div>

          <ThemeSwitcher compact />

          <AppSignedIn>
            {variant === "app" && !sub.loading && (
              <span className="plan-badge">
                {sub.planName}
                {sub.plan === "free" && " · research"}
              </span>
            )}
            {variant === "app" && showNewResearch && onReset && (
              <div className="nav-tabs">
                <button type="button" className="nav-tab" onClick={handleReset}>
                  new research
                </button>
              </div>
            )}
            {variant === "landing" && (
              <div className="nav-tabs">
                <Link href="/app" className="nav-tab">
                  open app
                </Link>
              </div>
            )}
            <div className="nav-tabs">
              <AppSignOutButton />
            </div>
            <AppUserButton />
          </AppSignedIn>

          <AppSignedOut>
            <div className="nav-tabs">
              <Link href="/sign-in" className="nav-tab">
                sign in
              </Link>
              <Link href="/sign-up" className="nav-tab nav-tab-primary">
                get started →
              </Link>
            </div>
          </AppSignedOut>
        </nav>

        <div className="flex shrink-0 items-center gap-3 md:hidden">
          <ThemeSwitcher compact />
          <AppSignedIn>
            <AppUserButton />
          </AppSignedIn>
          <button
            type="button"
            className="flex size-[34px] items-center justify-center border border-border bg-surface text-text"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "fixed inset-0 z-40 bg-bg/60 transition-opacity duration-200 ease-out md:hidden",
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeMenu}
        aria-hidden={!menuOpen}
      >
        <nav
          className={cn(
            "absolute top-[calc(3.5rem+env(safe-area-inset-top))] right-4 left-4 flex flex-col border border-border bg-bg transition-[opacity,transform] duration-200 ease-out",
            menuOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          )}
          aria-label="Mobile"
          onClick={(e) => e.stopPropagation()}
        >
          {variant === "landing" && (
            <Link href="/#features" className={cn(mobileItem, "bg-surface text-text hover:bg-bg hover:text-accent")} onClick={closeMenu}>
              features
            </Link>
          )}
          <Link href="/pricing" className={cn(mobileItem, "bg-surface text-text hover:bg-bg hover:text-accent")} onClick={closeMenu}>
            pricing
          </Link>

          <AppSignedIn>
            {variant === "app" && !sub.loading && (
              <span className={cn(mobileItem, "cursor-default bg-surface text-text-muted")}>
                plan: {sub.planName}
                {sub.plan === "free" && " · research only"}
              </span>
            )}
            {variant === "app" && showNewResearch && onReset && (
              <button className={cn(mobileItem, "bg-surface text-text hover:bg-bg hover:text-accent")} onClick={handleReset}>
                new research
              </button>
            )}
            {variant === "landing" && (
              <Link href="/app" className={cn(mobileItem, "bg-surface text-text hover:bg-bg hover:text-accent")} onClick={closeMenu}>
                open app
              </Link>
            )}
            <Link href="/account" className={cn(mobileItem, "bg-surface text-text hover:bg-bg hover:text-accent")} onClick={closeMenu}>
              account
            </Link>
            <AppSignOutButton
              className={cn(mobileItem, "bg-surface text-text hover:bg-bg hover:text-accent")}
              onClick={closeMenu}
            />
          </AppSignedIn>

          <AppSignedOut>
            <Link href="/sign-in" className={cn(mobileItem, "bg-surface text-text hover:bg-bg hover:text-accent")} onClick={closeMenu}>
              sign in
            </Link>
            <Link href="/sign-up" className={cn(mobileItem, "on-accent-fill hover:opacity-90")} onClick={closeMenu}>
              get started →
            </Link>
          </AppSignedOut>
        </nav>
      </div>
    </header>
  );
}
