"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List } from "@phosphor-icons/react";
import { AppSignedIn, AppSignedOut, AppSignOutButton, AppUserButton } from "@/components/AuthShell";
import { MarketingNavAuthDesktop } from "@/components/marketing/MarketingCta";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Wordmark from "@/components/Wordmark";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "landing" | "app";
}

const LINKS = [
  { href: "/#features", label: "Features", landingOnly: true },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs/mcp", label: "MCP" },
] as const;

const APP_HREF = "/app";
const SIGN_IN_HREF = "/sign-in";
const SIGN_UP_HREF = "/sign-up";

function NavPillLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-body-sm font-medium transition-colors duration-(--duration-fast)",
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
          : "text-foreground-secondary hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}

/**
 * Marketing and auth navigation. The mobile menu is a Sheet: the one allowed overlay,
 * used for navigation only (repo rule `no-modals`).
 */
export default function SiteNav({ variant = "landing" }: Props) {
  const pathname = usePathname();
  const links = LINKS.filter(
    (link) => !("landingOnly" in link && link.landingOnly) || variant === "landing"
  );

  return (
    <header className="sticky top-0 z-40 px-4 pt-3 sm:px-6">
      <div
        className="mx-auto flex h-12 w-full max-w-(--marketing-max) items-center gap-3 rounded-2xl border border-border/70 bg-background/85 px-3 shadow-sm backdrop-blur-md backdrop-saturate-150 sm:gap-4 sm:px-4"
        role="banner"
      >
        <Link
          href="/"
          className="shrink-0 rounded-lg px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark size="sm" />
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-center justify-center md:flex"
          aria-label="Main"
        >
          <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/35 p-1">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/#features" && pathname.startsWith(link.href));
              return (
                <NavPillLink key={link.href} href={link.href} label={link.label} active={active} />
              );
            })}
          </div>
        </nav>

        <div className="hidden items-center gap-2 md:ml-auto md:flex">
          <ThemeSwitcher />
          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
          <MarketingNavAuthDesktop />
        </div>

        <div className="ml-auto flex items-center gap-1.5 md:hidden">
          <ThemeSwitcher />
          <AppSignedIn>
            <Link href={APP_HREF} className={buttonVariants({ size: "sm" })}>
              App
            </Link>
            <AppUserButton />
          </AppSignedIn>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon-sm" aria-label="Open menu" />}>
              <List aria-hidden weight="bold" />
            </SheetTrigger>
            <SheetContent side="right" showCloseButton>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                {links.map((link) => (
                  <SheetClose
                    key={link.href}
                    nativeButton={false}
                    render={
                      <Link
                        href={link.href}
                        aria-current={pathname === link.href ? "page" : undefined}
                        className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "justify-start")}
                      />
                    }
                  >
                    {link.label}
                  </SheetClose>
                ))}

                <AppSignedIn>
                  <SheetClose
                    nativeButton={false}
                    render={
                      <Link
                        href={APP_HREF}
                        className={cn(buttonVariants({ size: "lg" }), "mt-3 justify-start")}
                      />
                    }
                  >
                    Open dashboard
                  </SheetClose>
                  <SheetClose
                    nativeButton={false}
                    render={
                      <Link
                        href="/account"
                        prefetch={false}
                        className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "justify-start")}
                      />
                    }
                  >
                    Account
                  </SheetClose>
                  <AppSignOutButton
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "lg" }),
                      "justify-start text-destructive"
                    )}
                  />
                </AppSignedIn>

                <AppSignedOut>
                  <SheetClose
                    nativeButton={false}
                    render={
                      <Link
                        href={SIGN_IN_HREF}
                        className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "mt-3 justify-start")}
                      />
                    }
                  >
                    Sign in
                  </SheetClose>
                  <SheetClose
                    nativeButton={false}
                    render={<Link href={SIGN_UP_HREF} className={cn(buttonVariants({ size: "lg" }))} />}
                  >
                    Get started
                  </SheetClose>
                </AppSignedOut>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
