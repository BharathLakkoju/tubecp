"use client";

import { useState } from "react";
import Link from "next/link";
import { WarningCircle } from "@phosphor-icons/react";
import type { KnowledgeBase } from "@/lib/types";
import KbBuildPolling from "@/components/KbBuildPolling";
import AppPage from "@/components/tubecp/AppPage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function KbFailedPanel({ kb }: { kb: KnowledgeBase }) {
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildKbId, setBuildKbId] = useState<string | null>(null);
  const videoCount = kb.buildJob?.totalVideos ?? kb.videoIds.length;

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

      setBuildKbId(kb.kbId);
    } catch {
      setError("Failed to retry knowledge base build");
    } finally {
      setRetrying(false);
    }
  };

  if (buildKbId) {
    return (
      <KbBuildPolling
        kbId={buildKbId}
        topic={kb.topic}
        videoCount={videoCount}
        onFailed={(message) => {
          setBuildKbId(null);
          setError(message);
        }}
      />
    );
  }

  return (
    <AppPage width="reading">
      <div className="flex flex-col gap-6 pt-6">
        <h1 className="text-headline text-foreground">Knowledge base build failed</h1>
        <Alert variant="destructive">
          <WarningCircle weight="fill" aria-hidden />
          <AlertTitle>Build did not finish for {kb.topic}</AlertTitle>
          <AlertDescription>
            Indexing may have completed for some videos before the build failed. Retry resumes where
            it left off instead of starting over.
            {error && <span className="mt-2 block font-medium">{error}</span>}
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleRetry} disabled={retrying} aria-busy={retrying}>
            {retrying && <Spinner data-icon="inline-start" />}
            {retrying ? "Starting retry…" : "Retry build"}
          </Button>
          <Link href="/app" prefetch={false} className={buttonVariants({ variant: "outline" })}>
            Back to research
          </Link>
        </div>
      </div>
    </AppPage>
  );
}
