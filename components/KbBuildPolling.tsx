"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import KbBuildProgress from "@/components/KbBuildProgress";
import AppPage from "@/components/tubecp/AppPage";
import { pollKnowledgeBaseBuild } from "@/lib/client/workflows";

interface Props {
  kbId: string;
  topic: string;
  videoCount?: number;
  onFailed?: (error: string) => void;
}

/**
 * Polls server build status and shows the shared KB build progress UI (research + retry flows).
 */
export default function KbBuildPolling({ kbId, topic, videoCount, onFailed }: Props) {
  const router = useRouter();
  const [progressPct, setProgressPct] = useState(5);
  const [progressMsg, setProgressMsg] = useState("Preparing transcripts");
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { kb } = await pollKnowledgeBaseBuild(kbId, (msg, pct) => {
          if (cancelled) return;
          setProgressMsg(msg);
          if (pct !== undefined) setProgressPct(pct);
        });

        if (cancelled) return;

        if (kb.status === "failed") {
          const message =
            "No videos could be indexed. Every selected video was missing a transcript or failed to index.";
          setError(message);
          onFailed?.(message);
          router.refresh();
          return;
        }

        router.refresh();
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Knowledge base build failed";
        setError(message);
        onFailed?.(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [kbId, onFailed, router]);

  return (
    <AppPage width="reading">
      <div className="flex flex-col gap-6 pt-6">
        <h1 className="text-headline text-foreground">{topic}</h1>
        <KbBuildProgress
          detail={progressMsg}
          progress={error ? progressPct : progressPct}
          videoCount={videoCount}
          startedAt={startedAt}
          error={error ?? undefined}
        />
      </div>
    </AppPage>
  );
}
