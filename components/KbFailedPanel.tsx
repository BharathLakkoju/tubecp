"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WarningCircle } from "@phosphor-icons/react";
import type { KnowledgeBase } from "@/lib/types";
import AppPage from "@/components/tubecp/AppPage";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { parseClientError } from "@/lib/client/chat";
import { continueKnowledgeBaseBuild } from "@/lib/client/kb-build";

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

      const result = await continueKnowledgeBaseBuild(kb.kbId);
      if (result.kb.status === "ready") {
        router.refresh();
        return;
      }

      setError("Build failed again. Try different videos.");
    } catch (err) {
      setError(parseClientError(err));
    } finally {
      setRetrying(false);
    }
  };

  return (
    <AppPage width="reading">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-headline text-foreground">Knowledge base build failed</h1>
          <p className="mt-2 text-body text-foreground-secondary">
            Build did not finish for <strong>{kb.topic}</strong>. Indexing may have completed for
            some videos before the build failed. Retry resumes where it left off instead of starting
            over.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <WarningCircle weight="fill" aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void handleRetry()} disabled={retrying}>
            {retrying ? (
              <span className="inline-flex items-center gap-2">
                <Spinner />
                Retrying build…
              </span>
            ) : (
              "Retry build"
            )}
          </Button>
          <Link href="/app" className={buttonVariants({ variant: "outline" })}>
            Back to research
          </Link>
        </div>
      </div>
    </AppPage>
  );
}
