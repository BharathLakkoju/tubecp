"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KbBuildOptions, KnowledgeBase, RankedVideo } from "@/lib/types";
import KbResearchSourcesSection from "@/components/KbResearchSourcesSection";
import type { KnowledgeBaseBuildStatus } from "@/lib/kb-build-status";
import { formatKbBuildEta, formatKbBuildRemaining } from "@/lib/kb-build-estimate";
import { parseClientError } from "@/lib/client/chat";
import {
  continueKnowledgeBaseBuild,
  runKbBuildDriverIfNeeded,
  type KbBuildProgressCallback,
} from "@/lib/client/kb-build";
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
  const [driving, setDriving] = useState(false);
  const driverStarted = useRef(false);

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

  useEffect(() => {
    if (!status || status.status !== "building") return;
    const interval = window.setInterval(() => {
      loadStatus().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [status?.status, loadStatus]);

  const runBuildDriver = useCallback(
    async (takeOver: boolean) => {
      setDriving(true);
      setError("");
      try {
        const onProgress: KbBuildProgressCallback = (_msg, _pct, live) => {
          if (live) setStatus(live);
        };
        const result = takeOver
          ? await continueKnowledgeBaseBuild(kb.kbId, onProgress, { takeOver: true })
          : await runKbBuildDriverIfNeeded(kb.kbId, onProgress);
        if (result?.kb.status === "ready") {
          await refreshKnowledgeBases();
          router.refresh();
        }
      } catch (err) {
        setError(parseClientError(err));
      } finally {
        setDriving(false);
      }
    },
    [kb.kbId, refreshKnowledgeBases, router]
  );

  useEffect(() => {
    if (driverStarted.current) return;
    let cancelled = false;
    driverStarted.current = true;

    const run = async () => {
      const current = await loadStatus();
      if (cancelled || current.status !== "building") return;
      await runBuildDriver(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [kb.kbId, loadStatus, runBuildDriver]);

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
            Progress is saved in your account — you can leave and return from any device.
          </p>
        </div>

        <JobStatus
          title="Building knowledge base"
          railLabel="Knowledge base build progress"
          steps={steps}
          progress={status.progress}
          progressText={`${status.processedVideos} of ${status.totalVideos} videos`}
          current={detailParts.join(" · ") || (driving ? "Indexing on this device…" : "Waiting to resume")}
          startedAt={new Date(status.startedAt).getTime()}
        />

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

        {status.status === "building" && (
          <div className="flex flex-col gap-2">
            <p className="text-body-sm text-foreground-secondary">
              Video indexing runs in this browser tab (not on the server) so builds can pause when
              you switch apps or open the KB on another device. Use the button below to pick up
              where you left off.
            </p>
            <Button
              type="button"
              disabled={driving}
              aria-busy={driving}
              onClick={() => void runBuildDriver(true)}
            >
              {driving ? "Indexing on this device…" : "Continue build on this device"}
            </Button>
          </div>
        )}

        <Link href="/app/kb" className="text-label text-primary underline-offset-2 hover:underline">
          Back to knowledge bases
        </Link>
      </div>
    </AppPage>
  );
}
