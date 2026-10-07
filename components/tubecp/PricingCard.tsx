"use client";

import Link from "next/link";
import { Check } from "@phosphor-icons/react";
import LiftCard from "@/components/motion/LiftCard";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { PricingPlanAction } from "@/lib/billing/plan-changes";
import type { PlanLimits } from "@/lib/plans";
import { cn } from "@/lib/utils";

interface Props {
  /** Name, price, and limits come only from `lib/plans.ts` (design system 9.2). */
  plan: PlanLimits;
  action: PricingPlanAction;
  isLoggedIn: boolean;
  recommended?: boolean;
  loading?: boolean;
  /** Show the cancel-via-billing hint under the button. */
  showCancelHint?: boolean;
  /** Navigation targets (sign-up, checkout) render as links, not buttons. */
  href?: string;
  onAction: () => void;
}

function actionLabel(action: PricingPlanAction, planName: string): string {
  switch (action) {
    case "signup":
      return "Get started free";
    case "checkout":
    case "upgrade":
      return `Upgrade to ${planName}`;
    case "downgrade_at_period_end":
      return `Switch to ${planName}`;
    case "cancel_via_account":
      return "Downgrade to free";
    default:
      return `Choose ${planName}`;
  }
}

function limitRows(plan: PlanLimits): string[] {
  const rows = [
    `${plan.researchPerDay} researches / day`,
    `${plan.kbBuildsPerMonth} KB builds / month`,
    `${plan.chatMessagesPerMonth} chat messages / month`,
    plan.persistentKbs ? "Persistent knowledge bases" : "Ranked lists only",
  ];
  if (plan.seatLimit) rows.push(`${plan.seatLimit} team seats, pooled usage`);
  return rows;
}

/** Pricing card (design system 6.15). Recommended card gets ring-primary and the one-time beam (M9). */
export default function PricingCard({
  plan,
  action,
  isLoggedIn,
  recommended = false,
  loading = false,
  showCancelHint = false,
  href,
  onAction,
}: Props) {
  const isCurrent = action === "current";
  const quiet = action === "downgrade_at_period_end" || action === "cancel_via_account";

  return (
    <LiftCard className="h-full">
      <Card
        className={cn(
          "h-full rounded-xl",
          recommended && !isCurrent && "pricing-beam ring-1 ring-primary"
        )}
      >
        <CardHeader>
          <CardTitle className="text-title-sm">
            <h2>{plan.name}</h2>
          </CardTitle>
          {recommended && !isCurrent && (
            <CardAction>
              <Badge>Recommended</Badge>
            </CardAction>
          )}
          {isCurrent && (
            <CardAction>
              <Badge variant="outline">Current plan</Badge>
            </CardAction>
          )}
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4">
          <p className="flex items-baseline gap-1">
            <span className="font-mono text-headline tabular-nums text-foreground">
              ${plan.priceMonthly}
            </span>
            <span className="text-caption text-foreground-secondary">/mo</span>
          </p>
          <ul className="flex flex-col gap-2">
            {limitRows(plan).map((row) => (
              <li key={row} className="flex items-start gap-2 font-mono text-label text-foreground-secondary">
                <Check aria-hidden weight="bold" className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {row}
              </li>
            ))}
          </ul>
        </CardContent>

        <CardFooter className="flex-col items-stretch gap-3 border-t-0 bg-transparent">
          {isCurrent ? null : plan.id === "free" && !isLoggedIn ? (
            <Link href="/sign-up" className={buttonVariants({ variant: "outline" })}>
              Get started free
            </Link>
          ) : href && !quiet ? (
            <Link
              href={href}
              className={buttonVariants({ variant: recommended ? "default" : "outline" })}
            >
              {actionLabel(action, plan.name)}
            </Link>
          ) : (
            <Button
              variant={recommended && !quiet ? "default" : "outline"}
              onClick={onAction}
              disabled={loading}
              aria-busy={loading}
            >
              {loading && <Spinner data-icon="inline-start" />}
              {loading ? "Updating..." : actionLabel(action, plan.name)}
            </Button>
          )}

          {showCancelHint && (
            <div className="rounded-lg border bg-muted p-3" role="status" aria-live="polite">
              <p className="text-caption text-foreground-secondary">
                To move to the free plan, cancel your subscription in account settings. You keep paid
                access until the end of your current billing period.
              </p>
              <Link
                href="/account/billing"
                className={cn(buttonVariants({ size: "sm" }), "mt-3 w-full")}
              >
                Go to billing and plans
              </Link>
            </div>
          )}

          {plan.id !== "free" && (
            <p className="text-caption text-foreground-secondary">
              By upgrading, you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-2">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/refund" className="underline underline-offset-2">
                Cancellation Policy
              </Link>
              . Payments are processed by{" "}
              <a
                href="https://polar.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Polar
              </a>{" "}
              as merchant of record.
            </p>
          )}
        </CardFooter>
      </Card>
    </LiftCard>
  );
}
