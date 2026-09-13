"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/lib/hooks/useSubscription";

const MAX_ATTEMPTS = 20;
const POLL_MS = 2000;

export default function UpgradeSuccessBanner() {
  const router = useRouter();
  const sub = useSubscription();
  const [confirmed, setConfirmed] = useState(sub.canBuildKb);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (sub.canBuildKb) {
      setConfirmed(true);
      return;
    }

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/user/subscription");
        if (!res.ok) return;
        const data = await res.json();
        const planId = data.subscription?.plan ?? data.plan?.id;
        const kbLimit = data.limits?.kbBuildsPerMonth ?? data.plan?.kbBuildsPerMonth ?? 0;

        if (planId !== "free" && kbLimit > 0) {
          setConfirmed(true);
          router.refresh();
          return;
        }
      } catch {
        // keep polling
      }

      if (attempts >= MAX_ATTEMPTS) {
        setTimedOut(true);
        return;
      }

      timer = setTimeout(poll, POLL_MS);
    };

    poll();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [sub.canBuildKb, router]);

  if (confirmed) {
    return (
      <div className="motion-fade-up mb-6 border border-border bg-surface px-4 py-3 text-center font-mono text-[13px] text-success">
        upgrade successful — you can now build knowledge bases and chat.
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="motion-fade-up mb-6 border border-border bg-surface px-4 py-3 text-center font-mono text-[13px] text-text-muted">
        payment received — your plan may take a minute to activate. refresh the page or check{" "}
        <a href="/account/billing" className="text-text underline">
          billing
        </a>
        .
      </div>
    );
  }

  return (
    <div className="motion-fade-up mb-6 border border-border bg-surface px-4 py-3 text-center font-mono text-[13px] text-text-muted">
      confirming your upgrade…
    </div>
  );
}
