"use client";

import JobStatus from "@/components/tubecp/JobStatus";
import type { PipelineStep } from "@/components/tubecp/PipelineRail";

interface Props {
  /** Latest server message (e.g. which video is being indexed). */
  detail?: string;
  /** 0-100. */
  progress: number;
  /** Number of videos being indexed, when known. */
  videoCount?: number;
  startedAt?: number;
  stalled?: boolean;
  onKeepWaiting?: () => void;
  error?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Knowledge base build status. The build API reports a message and a percentage, so the rail
 * only claims the steps we can actually observe: queued, indexing, ready.
 */
export default function KbBuildProgress({
  detail,
  progress,
  videoCount,
  startedAt,
  stalled,
  onKeepWaiting,
  error,
  onRetry,
  retryLabel,
}: Props) {
  const queued = progress < 3 && !error;
  const steps: PipelineStep[] = [
    { id: "queued", label: "Queued", state: queued ? "active" : "done" },
    {
      id: "indexing",
      label: "Indexing videos",
      state: queued ? "pending" : progress >= 100 ? "done" : "active",
      count: videoCount ? `${videoCount} videos` : undefined,
    },
    { id: "ready", label: "Ready", state: progress >= 100 ? "done" : "pending" },
  ];

  return (
    <JobStatus
      title="Building knowledge base"
      railLabel="Knowledge base build progress"
      steps={steps}
      progress={progress}
      progressText={videoCount ? `Indexing ${videoCount} videos` : "Indexing videos"}
      current={detail || "Preparing transcripts"}
      startedAt={startedAt}
      stalled={stalled}
      onKeepWaiting={onKeepWaiting}
      error={error}
      onRetry={onRetry}
      retryLabel={retryLabel}
    />
  );
}
