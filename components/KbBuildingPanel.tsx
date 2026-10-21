"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KbBuildOptions, KnowledgeBase, RankedVideo } from "@/lib/types";
import KbResearchSourcesSection from "@/components/KbResearchSourcesSection";
import type { KnowledgeBaseBuildStatus } from "@/lib/kb-build-status";
import { formatKbBuildEta, formatKbBuildRemaining } from "@/lib/kb-build-estimate";
import { parseClientError } from "@/lib/client/chat";
import { isKbBuildStatusStale } from "@/lib/kb-build-stale";
import { useKnowledgeBases } from "@/lib/hooks/useKnowledgeBases";
import AppPage from "@/components/tubecp/AppPage";
import JobStatus from "@/components/tubecp/JobStatus";
import type { PipelineStep } from "@/components/tubecp/PipelineRail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { WarningCircle } from "@phosphor-icons/react";

interface Props {
  kb: KnowledgeBase;
  sourceVideos?: RankedVideo[];
  indexedVideoIds?: string[];
  buildOptions?: KbBuildOptions;
}

export default function KbBuildingPanel({
  kb,
  sourceVideos = [],
  indexedVideoIds = [],
  buildOptions,
}: Props) {
  const router = useRouter();
  const { refresh: refreshKnowledgeBases } = useKnowledgeBases();
  const [status, setStatus] = useState<KnowledgeBaseBuildStatus | null>(null);
  const [liveIndexedVideoIds, setLiveIndexedVideoIds] = useState(indexedVideoIds);
  const [error, setError] = useState("");
  const [kicking, setKicking] = useState(false);
  const lastKickAt = useRef(0);

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/knowledge-base/${kb.kbId}/build-status`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to load build status");
    }
    const next = data as KnowledgeBaseBuildStatus;
    setStatus(next);
    if (Array.isArray(next.indexedVideoIds)) {
      setLiveIndexedVideoIds(next.indexedVideoIds);
    }
    return next;
  }, [kb.kbId]);

  useEffect(() => {
    loadStatus().catch((err) => setError(parseClientError(err)));
  }, [loadStatus]);

  const kickServerBuild = useCallback(async () => {
    setKicking(true);
    setError("");
    try {
      const res = await fetch(`/api/knowledge-base/${kb.kbId}/kick-build`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to resume server build");
      }
      await loadStatus();
    } catch (err) {
      setError(parseClientError(err));
    } finally {
      setKicking(false);
    }
  }, [kb.kbId, loadStatus]);

  useEffect(() => {
    if (!status || status.status !== "building") return;
    const interval = window.setInterval(() => {
      void loadStatus()
        .then((next) => {
          if (next.status === "ready" || next.status === "failed") {
            void refreshKnowledgeBases();
            router.refresh();
            return;
          }
          if (
            next.status === "building" &&
            isKbBuildStatusStale(next) &&
            Date.now() - lastKickAt.current > 30_000
          ) {
            lastKickAt.current = Date.now();
            void kickServerBuild();
          }
        })
        .catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [status?.status, loadStatus, refreshKnowledgeBases, router, kickServerBuild]);

  if (!status) {
    return (
      <AppPage width="reading">
        <p className="text-body-sm text-foreground-secondary">Loading build status…</p>
      </AppPage>
    );
  }

  const remaining = formatKbBuildRemaining(status.estimatedSecondsRemaining);
  const eta = formatKbBuildEta(status.estimatedCompletionAt);
  const detailParts = [
    status.currentVideoTitle ? `Now: ${status.currentVideoTitle}` : null,
    remaining,
    eta ? `Done about ${eta}` : null,
  ].filter(Boolean);

  const steps: PipelineStep[] = [
    { id: "queued", label: "Queued", state: "done" },
    {
      id: "indexing",
      label: "Indexing videos",
      state: status.progress >= 100 ? "done" : "active",
      count: `${status.processedVideos} / ${status.totalVideos}`,
    },
    { id: "ready", label: "Ready", state: status.progress >= 100 ? "done" : "pending" },
  ];

  return (
    <AppPage width="reading">
      <div className="flex flex-col gap-6">
        <div>
          <p className="font-mono text-label text-foreground-secondary">Knowledge base</p>
          <h1 className="text-headline text-foreground">{kb.topic}</h1>
          <p className="mt-2 text-body-sm text-foreground-secondary">
            Indexing runs on the server. You can close this page — progress is saved in your
            account and updates when you return.
          </p>
        </div>

        <JobStatus
          title="Building knowledge base"
          railLabel="Knowledge base build progress"
          steps={steps}
          progress={status.progress}
          progressText={`${status.processedVideos} of ${status.totalVideos} videos`}
          current={detailParts.join(" · ") || "Indexing on server…"}
          startedAt={new Date(status.startedAt).getTime()}
        />

        {status.status === "building" && isKbBuildStatusStale(status) && (
          <Alert>
            <WarningCircle weight="fill" aria-hidden />
            <AlertTitle>Build may have paused</AlertTitle>
            <AlertDescription>
              No progress recently. Use Resume server indexing to continue from the last saved
              video.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <WarningCircle weight="fill" aria-hidden />
            <AlertTitle>Build issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <KbResearchSourcesSection
          topic={kb.topic}
          videos={sourceVideos}
          kbId={kb.kbId}
          kbStatus={status.status}
          indexedVideoIds={liveIndexedVideoIds}
          transcriptMode={buildOptions?.transcriptMode ?? kb.buildOptions?.transcriptMode}
        />

        {status.status === "building" && isKbBuildStatusStale(status) && (
          <Button
            type="button"
            variant="outline"
            disabled={kicking}
            aria-busy={kicking}
            onClick={() => void kickServerBuild()}
          >
            {kicking ? "Starting…" : "Resume server indexing"}
          </Button>
        )}

        <Link href="/app/kb" className="text-label text-primary underline-offset-2 hover:underline">
          Back to knowledge bases
        </Link>
      </div>
    </AppPage>
  );
}
