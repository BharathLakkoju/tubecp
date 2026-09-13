"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getPricingPlanAction, type PricingPlanAction } from "@/lib/billing/plan-changes";
import { checkoutPathForPlan } from "@/lib/billing/checkout-flow";
import type { PlanId, PlanLimits } from "@/lib/plans";
import { cn } from "@/lib/cn";
import { formatDisplayDate } from "@/lib/format-display-date";

export type PricingSubscriptionContext = {
  planId: PlanId;
  status: string;
  periodEnd?: string;
  hasPolarSubscription: boolean;
};

type PricingPlansProps = {
  plans: PlanLimits[];
  isLoggedIn: boolean;
  subscription: PricingSubscriptionContext | null;
};

function pricingGridClass(planCount: number): string {
  if (planCount >= 4) {
    return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";
  }
  if (planCount === 3) {
    return "grid-cols-1 md:grid-cols-3";
  }
  if (planCount === 2) {
    return "grid-cols-1 sm:grid-cols-2";
  }
  return "grid-cols-1";
}

function pricingCardClass(planCount: number): string {
  if (planCount >= 4) {
    return cn(
      "border-b border-border sm:border-r max-xl:[&:nth-child(2n)]:border-r-0",
      "xl:border-b-0 xl:border-r xl:[&:nth-child(4n)]:border-r-0"
    );
  }

  if (planCount === 3) {
    return "border-b border-border max-md:last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0";
  }

  return "border-b border-border last:border-b-0";
}

function actionLabel(action: PricingPlanAction, planName: string): string {
  switch (action) {
    case "current":
      return "your current plan";
    case "signup":
      return "get started free →";
    case "checkout":
      return `upgrade to ${planName} →`;
    case "upgrade":
      return `upgrade to ${planName} →`;
    case "downgrade_at_period_end":
      return `switch to ${planName} →`;
    case "cancel_via_account":
      return "downgrade to free";
    default:
      return `choose ${planName} →`;
  }
}

export default function PricingPlans({ plans, isLoggedIn, subscription }: PricingPlansProps) {
  const router = useRouter();
  const [loadingPlanId, setLoadingPlanId] = useState<PlanId | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cancelHintForPlan, setCancelHintForPlan] = useState<PlanId | null>(null);

  const currentPlanId = subscription?.planId ?? "free";

  const handlePlanAction = async (targetPlanId: PlanId) => {
    const action = getPricingPlanAction({
      isLoggedIn,
      currentPlanId,
      targetPlanId,
      hasPolarSubscription: subscription?.hasPolarSubscription ?? false,
    });

    setError("");
    setMessage("");

    if (action === "current") {
      return;
    }

    if (action === "cancel_via_account") {
      setCancelHintForPlan(targetPlanId);
      return;
    }

    if (action === "signup") {
      router.push("/sign-up");
      return;
    }

    if (!isLoggedIn || action === "checkout") {
      router.push(checkoutPathForPlan(targetPlanId as "pro" | "researcher" | "team"));
      return;
    }

    setLoadingPlanId(targetPlanId);

    const res = await fetch("/api/billing/change-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: targetPlanId }),
    });
    const json = await res.json().catch(() => ({}));

    setLoadingPlanId(null);

    if (json.redirect) {
      router.push(json.redirect);
      return;
    }

    if (!res.ok) {
      setError(json.error ?? "Could not update your plan");
      return;
    }

    setMessage(json.message ?? "Plan updated.");
    router.refresh();
  };

  return (
    <>
      {isLoggedIn && subscription && (
        <p className="mb-6 border border-border bg-surface px-4 py-3 font-mono text-[13px] text-text-muted">
          You&apos;re on{" "}
          <span className="font-semibold text-text">
            {plans.find((p) => p.id === subscription.planId)?.name ?? subscription.planId}
          </span>
          {subscription.status === "canceled" ? (
            <>
              {" "}
              (canceled — access until {formatDisplayDate(subscription.periodEnd)})
            </>
          ) : subscription.periodEnd && subscription.planId !== "free" ? (
            <> — renews {formatDisplayDate(subscription.periodEnd)}</>
          ) : null}
        </p>
      )}

      {message && (
        <p className="mb-6 border border-border bg-surface px-4 py-3 font-mono text-[13px] text-text">
          {message}
        </p>
      )}

      {error && (
        <p className="mb-6 border border-red-500/40 bg-red-500/10 px-4 py-3 font-mono text-[13px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className={cn("mt-6 grid overflow-hidden border border-border", pricingGridClass(plans.length))}>
        {plans.map((plan, index) => {
          const action = getPricingPlanAction({
            isLoggedIn,
            currentPlanId,
            targetPlanId: plan.id,
            hasPolarSubscription: subscription?.hasPolarSubscription ?? false,
          });
          const isCurrent = action === "current";
          const isLoading = loadingPlanId === plan.id;

          return (
            <div
              key={plan.id}
              style={{ "--motion-index": index } as React.CSSProperties}
              className={cn(
                "motion-stagger-item relative flex min-w-0 flex-col bg-surface p-5",
                pricingCardClass(plans.length),
                plan.id === "pro" && "bg-bg",
                isCurrent && "ring-1 ring-inset ring-accent/40"
              )}
            >
              {plan.id === "pro" && !isCurrent && (
                <span className="on-accent-fill absolute top-0 right-0 left-0 px-2 py-1 text-center font-mono text-[10px] font-medium tracking-wide uppercase">
                  most popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute top-0 right-0 left-0 border-b border-accent/30 bg-accent/10 px-2 py-1 text-center font-mono text-[10px] font-medium tracking-wide text-accent uppercase">
                  your plan
                </span>
              )}
              <h2
                className={cn(
                  "font-mono text-sm font-semibold text-text",
                  (plan.id === "pro" && !isCurrent) || isCurrent ? "mt-4" : ""
                )}
              >
                {plan.name}
              </h2>
              <p className="my-4 font-mono text-[28px] font-semibold text-text max-sm:text-2xl">
                ${plan.priceMonthly}
                <span className="text-xs font-normal text-text-muted">/mo</span>
              </p>
              <ul className="mb-4 w-full md:mb-5 lg:flex-1">
                <li className="border-t border-border py-2 font-mono text-xs text-text-muted">
                  {plan.researchPerDay} researches / day
                </li>
                <li className="border-t border-border py-2 font-mono text-xs text-text-muted">
                  {plan.kbBuildsPerMonth} KB builds / month
                </li>
                <li className="border-t border-border py-2 font-mono text-xs text-text-muted">
                  {plan.chatMessagesPerMonth} chat messages / month
                </li>
                <li className="border-t border-border py-2 font-mono text-xs text-text-muted">
                  {plan.persistentKbs ? "Persistent knowledge bases" : "Ranked lists only"}
                </li>
                {plan.seatLimit ? (
                  <li className="border-t border-border py-2 font-mono text-xs text-text-muted">
                    {plan.seatLimit} team seats · pooled usage
                  </li>
                ) : null}
              </ul>
              <div className="mt-auto flex w-full flex-col gap-3">
                {isCurrent ? (
                  <span className="btn-ghost btn-block pointer-events-none opacity-70">
                    your current plan
                  </span>
                ) : plan.id === "free" && !isLoggedIn ? (
                  <Link href="/sign-up" className="btn-ghost btn-block">
                    get started free →
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      action === "downgrade_at_period_end" || action === "cancel_via_account"
                        ? "btn-ghost btn-block"
                        : "btn-primary btn-block"
                    )}
                    disabled={isLoading}
                    onClick={() => handlePlanAction(plan.id)}
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" />
                        Updating...
                      </span>
                    ) : (
                      actionLabel(action, plan.name)
                    )}
                  </button>
                )}
                {cancelHintForPlan === plan.id && (
                  <div
                    className="border border-border bg-bg px-3 py-3"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="font-mono text-[11px] leading-snug text-text-muted">
                      To move to the free plan, cancel your subscription in account settings. You
                      keep paid access until the end of your current billing period.
                    </p>
                    <Link href="/account/billing" className="btn-primary mt-3 inline-flex w-full justify-center">
                      Go to Billing &amp; plans →
                    </Link>
                  </div>
                )}
                {plan.id !== "free" && (
                  <p className="text-center font-mono text-[11px] leading-snug text-text-muted">
                    By upgrading, you agree to our{" "}
                    <Link href="/terms" className="text-text-muted underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/refund" className="text-text-muted underline">
                      Cancellation Policy
                    </Link>
                    . Payments are processed by{" "}
                    <a
                      href="https://polar.sh"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted underline"
                    >
                      Polar
                    </a>{" "}
                    as merchant of record.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
