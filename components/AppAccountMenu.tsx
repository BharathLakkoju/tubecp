"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { CaretUpDown, CreditCard, FileText, Gear, SignOut } from "@phosphor-icons/react";
import { useAuthSession } from "@/components/AuthShell";
import { useTheme } from "@/components/ThemeProvider";
import PlanBadge from "@/components/tubecp/PlanBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { LEGAL_LINKS } from "@/lib/legal";
import { isColorMode } from "@/lib/theme";

function userInitial(user: { name?: string | null; email?: string | null }): string {
  const source = user.name?.trim() || user.email?.trim() || "?";
  return source[0]?.toUpperCase() ?? "?";
}

function displayName(user: { name?: string | null; email?: string | null }): string {
  return user.name?.trim() || user.email?.trim() || "Account";
}

/**
 * Account menu (design system §6.14): Avatar + PlanBadge trigger, a DropdownMenu grouped into
 * Account / Preferences (theme radio group) / Legal, with Sign out last. Anchored popup, not a modal.
 */
export default function AppAccountMenu() {
  const { data: session } = useAuthSession();
  const sub = useSubscription();
  const { colorMode, setColorMode } = useTheme();

  if (!session?.user) return null;

  const user = session.user;
  const image = (user as { image?: string | null }).image;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-3 rounded-lg p-2 text-left outline-none transition-colors duration-(--duration-fast) hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-sidebar-accent"
        aria-label="Account menu"
      >
        <Avatar>
          {image && <AvatarImage src={image} alt="" />}
          <AvatarFallback>{userInitial(user)}</AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <span className="w-full truncate text-label text-foreground">{displayName(user)}</span>
          {!sub.loading && <PlanBadge planId={sub.plan} className="h-5 px-2" />}
        </span>
        <CaretUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/account" prefetch={false} />}>
            <Gear aria-hidden />
            Account settings
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/account/billing" prefetch={false} />}>
            <CreditCard aria-hidden />
            Billing &amp; plans
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={colorMode}
            onValueChange={(value) => {
              if (typeof value === "string" && isColorMode(value)) setColorMode(value);
            }}
          >
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Legal</DropdownMenuLabel>
          {LEGAL_LINKS.map((link) => (
            <DropdownMenuItem key={link.href} render={<Link href={link.href} prefetch={false} />}>
              <FileText aria-hidden />
              {link.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={() => void signOut({ callbackUrl: "/" })}>
          <SignOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
