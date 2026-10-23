"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { AppSignedIn, AppSignedOut, AppUserButton } from "@/components/AuthShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const APP_HREF = "/app";
const SIGN_IN_HREF = "/sign-in";
const SIGN_UP_HREF = "/sign-up";

export function MarketingHeroActions({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center", className)}>
      <AppSignedIn>
        <Link href={APP_HREF} className={cn(buttonVariants({ size: "lg" }), "sm:min-w-44")}>
          Open dashboard
          <ArrowRight data-icon="inline-end" aria-hidden />
        </Link>
        <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "lg" })}>
          View pricing
        </Link>
      </AppSignedIn>
      <AppSignedOut>
        <Link href={SIGN_UP_HREF} className={cn(buttonVariants({ size: "lg" }), "sm:min-w-44")}>
          Get started
          <ArrowRight data-icon="inline-end" aria-hidden />
        </Link>
        <Link href={SIGN_IN_HREF} className={buttonVariants({ variant: "outline", size: "lg" })}>
          Sign in
        </Link>
      </AppSignedOut>
    </div>
  );
}

export function MarketingBottomCtaActions({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center",
        className
      )}
    >
      <AppSignedIn>
        <Link href={APP_HREF} className={cn(buttonVariants({ size: "lg" }), "sm:min-w-44")}>
          Open dashboard
        </Link>
        <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "lg" })}>
          View pricing
        </Link>
      </AppSignedIn>
      <AppSignedOut>
        <Link href={SIGN_UP_HREF} className={cn(buttonVariants({ size: "lg" }), "sm:min-w-44")}>
          Get started free
        </Link>
        <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "lg" })}>
          View pricing
        </Link>
      </AppSignedOut>
    </div>
  );
}

export function MarketingNavAuthDesktop() {
  return (
    <>
      <AppSignedIn>
        <Link href={APP_HREF} className={buttonVariants({ size: "sm" })}>
          Dashboard
        </Link>
        <AppUserButton />
      </AppSignedIn>
      <AppSignedOut>
        <Link href={SIGN_IN_HREF} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Sign in
        </Link>
        <Link href={SIGN_UP_HREF} className={buttonVariants({ size: "sm" })}>
          Get started
        </Link>
      </AppSignedOut>
    </>
  );
}
