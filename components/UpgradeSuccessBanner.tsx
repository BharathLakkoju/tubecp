"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Info } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
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
      <Alert variant="success" role="status" className="mb-6">
        <CheckCircle weight="fill" aria-hidden />
        <AlertTitle>Upgrade successful</AlertTitle>
        <AlertDescription>You can now build knowledge bases and chat with them.</AlertDescription>
      </Alert>
    );
  }

  if (timedOut) {
    return (
      <Alert variant="info" role="status" className="mb-6">
        <Info weight="fill" aria-hidden />
        <AlertTitle>Payment received</AlertTitle>
        <AlertDescription>
          Your plan may take a minute to activate. Refresh the page or check{" "}
          <Link href="/account/billing">billing</Link>.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="default" role="status" className="mb-6">
      <Spinner aria-hidden role="presentation" />
      <AlertTitle>Confirming your upgrade</AlertTitle>
      <AlertDescription>This usually takes a few seconds.</AlertDescription>
    </Alert>
  );
}
