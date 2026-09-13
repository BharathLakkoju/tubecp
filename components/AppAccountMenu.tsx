"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useAuthSession } from "@/components/AuthShell";
import {
  CaretDown,
  CreditCard,
  FileText,
  Gear,
  SignOut,
} from "@phosphor-icons/react";
import AnimatedCollapse from "@/components/AnimatedCollapse";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { cn } from "@/lib/cn";

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of service" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/refund", label: "Cancellation & refunds" },
] as const;

type MenuEntry =
  | { type: "link"; href: string; label: string; icon: typeof Gear }
  | { type: "divider" }
  | { type: "theme" }
  | { type: "signout" };

const MENU_ITEMS: MenuEntry[] = [
  { type: "link", href: "/account", label: "Account settings", icon: Gear },
  { type: "link", href: "/account/billing", label: "Billing & plans", icon: CreditCard },
  { type: "divider" },
  { type: "theme" },
  { type: "divider" },
  ...LEGAL_LINKS.map((l) => ({ type: "link" as const, href: l.href, label: l.label, icon: FileText })),
  { type: "divider" },
  { type: "signout" },
];

function userInitial(user: { name?: string | null; email?: string | null }): string {
  const source = user.name?.trim() || user.email?.trim() || "?";
  return source[0]?.toUpperCase() ?? "?";
}

function displayName(user: { name?: string | null; email?: string | null }): string {
  return user.name?.trim() || user.email?.trim() || "Account";
}

export default function AppAccountMenu() {
  const { data: session } = useAuthSession();
  const sub = useSubscription();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!session?.user) return null;

  const user = session.user;
  let animatedIndex = 0;

  return (
    <div className="app-account-menu" ref={rootRef}>
      <AnimatedCollapse open={open} innerClassName="app-account-drawer-inner">
        {open && (
        <nav className="app-account-drawer" aria-label="Account menu">
          {MENU_ITEMS.map((item, i) => {
            if (item.type === "divider") {
              return <div key={`div-${i}`} className="app-menu-divider" role="separator" />;
            }

            const delay = open ? animatedIndex++ * 35 : 0;
            const animClass = "app-drawer-item-animated";

            if (item.type === "theme") {
              return (
                <div
                  key="theme"
                  className={animClass}
                  style={{ animationDelay: `${delay}ms` }}
                >
                  <ThemeSwitcher showLabel />
                </div>
              );
            }

            if (item.type === "signout") {
              return (
                <button
                  key="signout"
                  type="button"
                  className={cn("app-menu-item app-menu-item-danger", animClass)}
                  style={{ animationDelay: `${delay}ms` }}
                  onClick={() => {
                    setOpen(false);
                    void signOut({ callbackUrl: "/" });
                  }}
                >
                  <SignOut size={16} weight="regular" aria-hidden />
                  Sign out
                </button>
              );
            }

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn("app-menu-item", animClass)}
                style={{ animationDelay: `${delay}ms` }}
                onClick={() => setOpen(false)}
              >
                <Icon size={16} weight="regular" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        )}
      </AnimatedCollapse>

      <button
        type="button"
        className={cn("app-account-trigger", open && "app-account-trigger-open")}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="app-account-avatar" aria-hidden>
          {user.image ? (
            <img src={user.image} alt="" className="size-full object-cover" />
          ) : (
            userInitial(user)
          )}
        </span>
        <span className="app-account-label">
          <span className="app-account-name">{displayName(user)}</span>
          {!sub.loading && <span className="app-account-plan">{sub.planName}</span>}
        </span>
        <CaretDown
          size={14}
          weight="bold"
          className={cn("app-account-caret", open && "app-account-caret-open")}
          aria-hidden
        />
      </button>
    </div>
  );
}
