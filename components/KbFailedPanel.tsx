"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WarningCircle } from "@phosphor-icons/react";
import type { KnowledgeBase } from "@/lib/types";
import AppPage from "@/components/tubecp/AppPage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function KbFailedPanel({ kb }: { kb: KnowledgeBase }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    setRetrying(true);
    setError(null);

    try {
      const res = await fetch(`/api/knowledge-base/${kb.kbId}/retry`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Failed to retry knowledge base build");
        return;
      }

      const deadline = Date.now() + 10 * 60 * 1000;
      while (Date.now() < deadline) {
        const statusRes = await fetch(`/api/knowledge-base/${kb.kbId}/build-status`);
        const status = await statusRes.json();
        if (!statusRes.ok) {
          setError(status.error ?? "Failed to check build status");
          return;
        }
        if (status.status === "ready") {
          router.refresh();
          return;
        }
        if (status.status === "failed") {
          setError(status.error ?? "Build failed again. Try different videos.");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setError("Build is still running. Refresh this page in a moment.");
    } catch {
      setError("Failed to retry knowledge base build");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <AppPage width="reading">
      <div className="flex flex-col gap-6 pt-6">
        <h1 className="text-headline text-foreground">Knowledge base build failed</h1>
        <Alert variant="destructive">
          <WarningCircle weight="fill" aria-hidden />
          <AlertTitle>No transcript content was indexed for {kb.topic}</AlertTitle>
          <AlertDescription>
            This usually means every selected video was missing captions or failed to process.
            {error && <span className="mt-2 block font-medium">{error}</span>}
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleRetry} disabled={retrying} aria-busy={retrying}>
            {retrying && <Spinner data-icon="inline-start" />}
            {retrying ? "Retrying build..." : "Retry build"}
          </Button>
          <Link href="/app" prefetch={false} className={buttonVariants({ variant: "outline" })}>
            Back to research
          </Link>
        </div>
      </div>
    </AppPage>
  );
}
