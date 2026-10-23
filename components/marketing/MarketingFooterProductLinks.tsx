"use client";

import Link from "next/link";
import { AppSignedIn, AppSignedOut } from "@/components/AuthShell";

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xs text-body-sm text-foreground-secondary transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </Link>
  );
}

export default function MarketingFooterProductLinks() {
  return (
    <>
      <FooterLink href="/app" label="Research" />
      <FooterLink href="/pricing" label="Pricing" />
      <AppSignedIn>
        <FooterLink href="/account" label="Account" />
        <FooterLink href="/app" label="Dashboard" />
      </AppSignedIn>
      <AppSignedOut>
        <FooterLink href="/sign-in" label="Sign in" />
        <FooterLink href="/sign-up" label="Get started" />
      </AppSignedOut>
    </>
  );
}
