"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m, useMotionValueEvent, useScroll } from "framer-motion";
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

const CONDENSE_AT = 16;
const HIDE_AFTER = 480;
const HIDE_TRAVEL = 64;
const REVEAL_TRAVEL = 24;

/**
 * `condensed` once the page leaves the top; `hidden` after a sustained scroll down past the hero.
 * Travel is measured from the last direction change because smooth scrolling emits tiny deltas.
 */
function useNavScrollState() {
  const { scrollY } = useScroll();
  const [condensed, setCondensed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const turnY = useRef(0);

  useEffect(() => {
    lastY.current = turnY.current = scrollY.get();
    setCondensed(lastY.current > CONDENSE_AT);
  }, [scrollY]);

  useMotionValueEvent(scrollY, "change", (y) => {
    const goingDown = y > lastY.current;
    const wasGoingDown = lastY.current > turnY.current;
    if (goingDown !== wasGoingDown) turnY.current = lastY.current;
    lastY.current = y;

    setCondensed(y > CONDENSE_AT);
    if (y < HIDE_AFTER) setHidden(false);
    else if (goingDown && y - turnY.current > HIDE_TRAVEL) setHidden(true);
    else if (!goingDown && turnY.current - y > REVEAL_TRAVEL) setHidden(false);
  });

  return { condensed, hidden, reveal: () => setHidden(false) };
}

function NavLink({
  href,
  label,
  active,
  hovered,
  onHover,
}: {
  href: string;
  label: string;
  active: boolean;
  hovered: boolean;
  onHover: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onMouseEnter={onHover}
      onFocus={onHover}
      className={cn(
        "relative isolate rounded-full px-3.5 py-1.5 text-body-sm font-medium outline-none transition-colors duration-(--duration-fast) focus-visible:ring-2 focus-visible:ring-ring",
        active || hovered ? "text-foreground" : "text-foreground-secondary"
      )}
    >
      {hovered && (
        <m.span
          layoutId="site-nav-hover"
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-muted"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />
      )}
      {label}
      {active && (
        <m.span
          layoutId="site-nav-active"
          aria-hidden
          className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />
      )}
    </Link>
  );
}

/**
 * Marketing and auth navigation. Starts transparent and full-width, condenses into a floating
 * capsule on scroll, and tucks away while scrolling down. The mobile menu is a Sheet: the one
 * allowed overlay, used for navigation only (repo rule `no-modals`).
 */
export default function SiteNav({ variant = "landing" }: Props) {
  const pathname = usePathname();
  const { condensed, hidden, reveal } = useNavScrollState();
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const links = LINKS.filter(
    (link) => !("landingOnly" in link && link.landingOnly) || variant === "landing"
  );

  return (
    <header
      onFocusCapture={reveal}
      className={cn(
        "sticky top-0 z-40 h-18 px-4 transition-[padding,translate,opacity] duration-(--duration-slow) ease-(--ease-out) sm:px-6",
        condensed ? "pt-3" : "pt-1",
        hidden && "pointer-events-none -translate-y-full opacity-0"
      )}
    >
      <div
        role="banner"
        className={cn(
          "mx-auto grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3 border transition-[max-width,height,padding,background-color,border-color,box-shadow,border-radius] duration-(--duration-slow) ease-(--ease-out)",
          condensed
            ? "h-12 max-w-3xl rounded-full border-border/70 bg-background/75 pr-1.5 pl-3 shadow-(--shadow-2) backdrop-blur-xl backdrop-saturate-150"
            : "h-16 max-w-(--marketing-max) rounded-2xl border-transparent bg-transparent px-1"
        )}
      >
        <Link
          href="/"
          className="justify-self-start rounded-lg px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark size="sm" />
        </Link>

        <nav
          className="hidden items-center md:flex"
          aria-label="Main"
          onMouseLeave={() => setHoveredHref(null)}
          onBlur={() => setHoveredHref(null)}
        >
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/#features" && pathname.startsWith(link.href));
            return (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={active}
                hovered={hoveredHref === link.href}
                onHover={() => setHoveredHref(link.href)}
              />
            );
          })}
        </nav>

        <div className="col-start-3 flex items-center justify-self-end gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <ThemeSwitcher />
            <MarketingNavAuthDesktop />
          </div>

          <div className="flex items-center gap-1.5 md:hidden">
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
      </div>
    </header>
  );
}
