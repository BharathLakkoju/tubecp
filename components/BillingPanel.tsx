"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Prohibit } from "@phosphor-icons/react";
import PlanBadge from "@/components/tubecp/PlanBadge";
import StatTile from "@/components/tubecp/StatTile";
import StatusBadge, { type JobStatusKind } from "@/components/tubecp/StatusBadge";
import { FormAlert, SettingsSection } from "@/components/tubecp/FormKit";
import InlineConfirm from "@/components/tubecp/InlineConfirm";
import { buttonVariants, Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { checkoutPathForPlan } from "@/lib/billing/checkout-flow";

type BillingInfo = {
  plan: { id: string; name: string; priceMonthly: number };
  subscription: {
    plan: string;
    status: string;
    periodEnd?: string;
    polarSubscriptionId?: string;
  };
  usage: {
    kbBuildsUsed: number;
    chatMessagesUsed: number;
    researchUsedToday: number;
  };
  limits: {
    kbBuildsPerMonth: number;
    chatMessagesPerMonth: number;
    researchPerDay: number;
  };
};

/** Free plans carry a far-future sentinel period end (year 2100): nothing renews. */
function isSentinelDate(iso?: string): boolean {
  if (!iso) return true;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) || date.getUTCFullYear() >= 2100;
}

function formatDate(iso?: string): string {
  if (!iso || isSentinelDate(iso)) return "-";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusKind(status: string): JobStatusKind {
  if (status === "active") return "done";
  if (status === "canceled" || status === "past_due") return "warning";
  return "info";
}

export default function BillingPanel() {
  const [data, setData] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/user/subscription")
      .then((r) => r.json())
      .then((json) => {
        if (!json.plan) throw new Error(json.error ?? "Failed to load billing");
        setData(json as BillingInfo);
      })
      .catch((err) => setError(String(err).replace(/^Error: /, "")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async () => {
    if (!data || data.subscription.plan === "free") return;

    setError("");
    setMessage("");

    const res = await fetch("/api/billing/cancel", { method: "POST" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error ?? "Failed to cancel subscription");
    }

    setMessage(json.message ?? "Subscription will cancel at the end of your billing period.");
    load();
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading billing details">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (error && !data) {
    return <FormAlert kind="error">{error}</FormAlert>;
  }

  if (!data) return null;

  const planId = data.subscription.plan;
  const isPaid = planId !== "free";
  const isCanceled = data.subscription.status === "canceled";
  const hasRenewal = !isSentinelDate(data.subscription.periodEnd);
  const pct = (used: number, limit: number) => (limit > 0 ? Math.round((used / limit) * 100) : 0);

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Current plan">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="text-label text-foreground-secondary">Plan</dt>
            <dd className="flex flex-wrap items-center gap-2 text-body text-foreground">
              <PlanBadge planId={data.plan.id} />
              {data.plan.priceMonthly > 0 && (
                <span className="font-mono text-body-sm tabular-nums text-foreground-secondary">
                  ${data.plan.priceMonthly}/mo
                </span>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-label text-foreground-secondary">Status</dt>
            <dd>
              <StatusBadge status={statusKind(data.subscription.status)}>
                <span className="capitalize">{data.subscription.status.replace("_", " ")}</span>
              </StatusBadge>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-label text-foreground-secondary">
              {!isPaid ? "Usage resets on" : isCanceled ? "Access until" : "Renews on"}
            </dt>
            <dd className="text-body text-foreground">
              {hasRenewal ? formatDate(data.subscription.periodEnd) : "No renewal scheduled"}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          {planId === "free" && (
            <Link href="/pricing" className={buttonVariants()}>
              See plans
            </Link>
          )}

          {planId === "pro" && !isCanceled && (
            <Link href={checkoutPathForPlan("researcher")} className={buttonVariants()}>
              Upgrade to Researcher
            </Link>
          )}
        </div>

        {isCanceled && (
          <FormAlert kind="success">
            Your subscription is canceled. You keep paid access until{" "}
            {formatDate(data.subscription.periodEnd)}.
          </FormAlert>
        )}
      </SettingsSection>

      <section aria-labelledby="usage-heading" className="flex flex-col gap-3">
        <h2 id="usage-heading" className="text-title text-foreground">
          Usage this period
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Research today"
            value={`${data.usage.researchUsedToday} / ${data.limits.researchPerDay}`}
            progress={pct(data.usage.researchUsedToday, data.limits.researchPerDay)}
            thresholds
          />
          {data.limits.kbBuildsPerMonth > 0 && (
            <StatTile
              label="KB builds"
              value={`${data.usage.kbBuildsUsed} / ${data.limits.kbBuildsPerMonth}`}
              progress={pct(data.usage.kbBuildsUsed, data.limits.kbBuildsPerMonth)}
              thresholds
            />
          )}
          {data.limits.chatMessagesPerMonth > 0 && (
            <StatTile
              label="Chat messages"
              value={`${data.usage.chatMessagesUsed} / ${data.limits.chatMessagesPerMonth}`}
              progress={pct(data.usage.chatMessagesUsed, data.limits.chatMessagesPerMonth)}
              thresholds
            />
          )}
        </div>
      </section>

      {message && <FormAlert kind="success">{message}</FormAlert>}
      {error && <FormAlert kind="error">{error}</FormAlert>}

      {isPaid && !isCanceled && (
        <SettingsSection
          title="Cancel subscription"
          description="You keep access until the end of the current billing period."
          danger
        >
          <InlineConfirm
            trigger={(open) => (
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive-subtle hover:text-destructive"
                onClick={open}
              >
                <Prohibit data-icon="inline-start" aria-hidden />
                Cancel subscription
              </Button>
            )}
            title="Cancel your subscription?"
            description={`You keep paid access until ${formatDate(data.subscription.periodEnd)}.`}
            confirmLabel="Cancel subscription"
            busyLabel="Canceling..."
            cancelLabel="Keep subscription"
            onConfirm={handleCancel}
          />
        </SettingsSection>
      )}

      <p className="text-label text-foreground-secondary">
        Cancellations take effect at the end of your billing period. See our{" "}
        <Link href="/refund" className="text-primary underline underline-offset-2">
          cancellation policy
        </Link>
        .
      </p>
    </div>
  );
}
