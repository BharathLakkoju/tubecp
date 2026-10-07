"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List } from "@phosphor-icons/react";
import { AppSignedIn, AppSignedOut, AppSignOutButton, AppUserButton } from "@/components/AuthShell";
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

/**
 * Marketing and auth navigation. The mobile menu is a Sheet: the one allowed overlay,
 * used for navigation only (repo rule `no-modals`).
 */
export default function SiteNav({ variant = "landing" }: Props) {
  const pathname = usePathname();
  const links = LINKS.filter((link) => !("landingOnly" in link && link.landingOnly) || variant === "landing");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-14 w-full max-w-(--marketing-max) items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 rounded-md px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark size="sm" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  active ? "text-foreground" : "text-foreground-secondary"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeSwitcher />
          <AppSignedIn>
            <Link href="/app" className={buttonVariants()}>
              Open app
            </Link>
            <AppUserButton />
          </AppSignedIn>
          <AppSignedOut>
            <Link href="/sign-in" className={buttonVariants({ variant: "ghost" })}>
              Sign in
            </Link>
            <Link href="/sign-up" className={buttonVariants()}>
              Get started
            </Link>
          </AppSignedOut>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeSwitcher />
          <AppSignedIn>
            <AppUserButton />
          </AppSignedIn>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open menu" />}>
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
                    render={
                      <Link
                        href="/app"
                        className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "justify-start")}
                      />
                    }
                  >
                    Open app
                  </SheetClose>
                  <SheetClose
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
                    render={
                      <Link
                        href="/sign-in"
                        className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "justify-start")}
                      />
                    }
                  >
                    Sign in
                  </SheetClose>
                  <SheetClose
                    render={<Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "mt-2")} />}
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
