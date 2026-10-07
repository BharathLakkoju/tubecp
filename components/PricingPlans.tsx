"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info } from "@phosphor-icons/react";
import Stagger, { StaggerItem } from "@/components/motion/Stagger";
import PricingCard from "@/components/tubecp/PricingCard";
import { FormAlert } from "@/components/tubecp/FormKit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getPricingPlanAction, type PricingPlanAction } from "@/lib/billing/plan-changes";
import { checkoutPathForPlan } from "@/lib/billing/checkout-flow";
import type { PlanId, PlanLimits } from "@/lib/plans";
import { formatDisplayDate } from "@/lib/format-display-date";
import { cn } from "@/lib/utils";

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

/** Actions that only navigate (sign-up, checkout) are links; the rest call the API. */
function planHref(
  planId: PlanId,
  action: PricingPlanAction,
  isLoggedIn: boolean
): string | undefined {
  if (action === "current" || action === "cancel_via_account") return undefined;
  if (action === "signup") return "/sign-up";
  if (planId === "free") return undefined;
  if (!isLoggedIn || action === "checkout") {
    return checkoutPathForPlan(planId as "pro" | "researcher" | "team");
  }
  return undefined;
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
    <div className="flex flex-col gap-6">
      {isLoggedIn && subscription && (
        <Alert variant="info" role="status">
          <Info weight="fill" aria-hidden />
          <AlertDescription className="text-foreground">
            You&apos;re on{" "}
            <span className="font-semibold">
              {plans.find((p) => p.id === subscription.planId)?.name ?? subscription.planId}
            </span>
            {subscription.status === "canceled" ? (
              <> (canceled, access until {formatDisplayDate(subscription.periodEnd)})</>
            ) : subscription.periodEnd && subscription.planId !== "free" ? (
              <>, renews {formatDisplayDate(subscription.periodEnd)}</>
            ) : null}
            .
          </AlertDescription>
        </Alert>
      )}

      {message && <FormAlert kind="success">{message}</FormAlert>}
      {error && <FormAlert kind="error">{error}</FormAlert>}

      <Stagger as="ul" className={cn("grid items-stretch gap-4", pricingGridClass(plans.length))}>
        {plans.map((plan, index) => {
          const action = getPricingPlanAction({
            isLoggedIn,
            currentPlanId,
            targetPlanId: plan.id,
            hasPolarSubscription: subscription?.hasPolarSubscription ?? false,
          });

          return (
            <StaggerItem key={plan.id} as="li" index={index} className="h-full">
              <PricingCard
                plan={plan}
                action={action}
                isLoggedIn={isLoggedIn}
                recommended={plan.id === "pro"}
                loading={loadingPlanId === plan.id}
                showCancelHint={cancelHintForPlan === plan.id}
                href={planHref(plan.id, action, isLoggedIn)}
                onAction={() => void handlePlanAction(plan.id)}
              />
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
