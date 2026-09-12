"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
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

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BillingPanel() {
  const [data, setData] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/user/subscription")
      .then((r) => r.json())
      .then((json) => {
        if (!json.plan) throw new Error(json.error ?? "Failed to load billing");
        setData(json as BillingInfo);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async () => {
    if (!data || data.subscription.plan === "free") return;
    if (!window.confirm("Cancel your subscription? You keep access until the end of the current billing period.")) {
      return;
    }

    setCanceling(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/billing/cancel", { method: "POST" });
    const json = await res.json().catch(() => ({}));

    setCanceling(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to cancel subscription");
      return;
    }

    setMessage(json.message ?? "Subscription will cancel at the end of your billing period.");
    load();
  };

  if (loading) {
    return <LoadingSpinner label="Loading billing details..." />;
  }

  if (error && !data) {
    return <p className="font-sans text-sm text-accent">{error}</p>;
  }

  if (!data) return null;

  const planId = data.subscription.plan;
  const isPaid = planId !== "free";
  const isCanceled = data.subscription.status === "canceled";

  return (
    <div className="auth-profile">
      <section className="auth-profile-section">
        <h2 className="auth-profile-title">Current plan</h2>
        <dl className="auth-profile-meta">
          <div>
            <dt>Plan</dt>
            <dd>
              {data.plan.name}
              {data.plan.priceMonthly > 0 && ` — $${data.plan.priceMonthly}/mo`}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className="capitalize">{data.subscription.status.replace("_", " ")}</dd>
          </div>
          <div>
            <dt>{isPaid ? "Renews on" : "Usage resets on"}</dt>
            <dd>{formatDate(data.subscription.periodEnd)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-3">
          {planId === "free" && (
            <Link href="/pricing" className="btn-primary inline-flex">
              Upgrade now
            </Link>
          )}

          {planId === "pro" && !isCanceled && (
            <Link href={checkoutPathForPlan("researcher")} className="btn-primary inline-flex">
              Upgrade to Researcher
            </Link>
          )}

          {isPaid && !isCanceled && (
            <button
              type="button"
              className="btn-ghost inline-flex text-accent"
              onClick={handleCancel}
              disabled={canceling}
            >
              {canceling ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Canceling...
                </span>
              ) : (
                "Cancel subscription"
              )}
            </button>
          )}
        </div>

        {isCanceled && (
          <p className="mt-4 font-sans text-sm text-text-muted">
            Your subscription is canceled. You keep paid access until{" "}
            {formatDate(data.subscription.periodEnd)}.
          </p>
        )}
      </section>

      <section className="auth-profile-section">
        <h2 className="auth-profile-title">Usage this period</h2>
        <dl className="auth-profile-meta">
          <div>
            <dt>Research today</dt>
            <dd>
              {data.usage.researchUsedToday} / {data.limits.researchPerDay}
            </dd>
          </div>
          {data.limits.kbBuildsPerMonth > 0 && (
            <div>
              <dt>KB builds</dt>
              <dd>
                {data.usage.kbBuildsUsed} / {data.limits.kbBuildsPerMonth}
              </dd>
            </div>
          )}
          {data.limits.chatMessagesPerMonth > 0 && (
            <div>
              <dt>Chat messages</dt>
              <dd>
                {data.usage.chatMessagesUsed} / {data.limits.chatMessagesPerMonth}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {message && (
        <p className="border border-border bg-surface px-4 py-3 font-sans text-sm text-text-muted">
          {message}
        </p>
      )}

      {error && data && (
        <p className="mt-4 border border-red-500/40 bg-red-500/10 px-4 py-3 font-sans text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <p className="font-sans text-xs text-text-muted">
        Cancellations take effect at the end of your billing period. See our{" "}
        <Link href="/refund" className="text-accent">cancellation policy</Link>.
      </p>
    </div>
  );
}
