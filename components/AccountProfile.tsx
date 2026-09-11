"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type SubscriptionInfo = {
  plan: { name: string };
  subscription: {
    plan: string;
    status: string;
    periodEnd?: string;
    userId: string;
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
    month: "short",
    day: "numeric",
  });
}

export default function AccountProfile() {
  const { data: session, status, update } = useSession();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  const user = session?.user;

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  useEffect(() => {
    if (!user) return;

    fetch("/api/user/subscription")
      .then((r) => r.json())
      .then((data) => {
        if (data.plan) setSubscription(data as SubscriptionInfo);
      })
      .catch(() => {});
  }, [user]);

  if (status === "loading") {
    return (
      <p className="font-mono text-[13px] text-text-muted">Loading account...</p>
    );
  }

  if (!user) {
    return (
      <p className="font-mono text-[13px] text-text-muted">
        You are not signed in.
      </p>
    );
  }

  const displayName = name || user.name || "";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: displayName.trim() }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update profile");
      return;
    }

    const data = await res.json().catch(() => ({}));
    const savedName = typeof data.name === "string" ? data.name : displayName.trim();
    setName(savedName);
    await update({ user: { name: savedName } });
    setMessage("Profile updated.");
  };

  return (
    <div className="auth-profile">
      <section className="auth-profile-section">
        <h2 className="auth-profile-title">Profile</h2>
        <dl className="auth-profile-meta">
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>User ID</dt>
            <dd className="break-all">{user.id}</dd>
          </div>
        </dl>
      </section>

      {subscription && (
        <section className="auth-profile-section">
          <h2 className="auth-profile-title">Plan &amp; usage</h2>
          <dl className="auth-profile-meta">
            <div>
              <dt>Current plan</dt>
              <dd>{subscription.plan.name}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{subscription.subscription.status}</dd>
            </div>
            <div>
              <dt>Renews / resets</dt>
              <dd>{formatDate(subscription.subscription.periodEnd)}</dd>
            </div>
            <div>
              <dt>Research today</dt>
              <dd>
                {subscription.usage.researchUsedToday} / {subscription.limits.researchPerDay}
              </dd>
            </div>
            {subscription.limits.kbBuildsPerMonth > 0 && (
              <div>
                <dt>KB builds this period</dt>
                <dd>
                  {subscription.usage.kbBuildsUsed} / {subscription.limits.kbBuildsPerMonth}
                </dd>
              </div>
            )}
            {subscription.limits.chatMessagesPerMonth > 0 && (
              <div>
                <dt>Chat messages this period</dt>
                <dd>
                  {subscription.usage.chatMessagesUsed} / {subscription.limits.chatMessagesPerMonth}
                </dd>
              </div>
            )}
          </dl>
          {subscription.subscription.plan === "free" && (
            <Link href="/pricing" className="btn-primary mt-4 inline-flex">
              upgrade plan →
            </Link>
          )}
        </section>
      )}

      <section className="auth-profile-section">
        <h2 className="auth-profile-title">Display name</h2>
        <form className="auth-form" onSubmit={handleSave}>
          {error && (
            <p className="border border-red-500/40 bg-red-500/10 px-4 py-3 font-mono text-[13px] text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {message && (
            <p className="border border-border bg-surface px-4 py-3 font-mono text-[13px] text-text-muted">
              {message}
            </p>
          )}
          <label className="auth-field">
            <span className="auth-label">Name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setName(e.target.value)}
              placeholder={user.name ?? "Your name"}
              disabled={saving}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>
    </div>
  );
}
