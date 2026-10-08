import type { KbBuildJobState, KnowledgeBase } from "@/lib/types";

export const KB_BUILD_DEFAULT_SECONDS_PER_VIDEO = 55;

export function estimateKbBuildCompletion(
  job: KbBuildJobState,
  status: KnowledgeBase["status"]
): { estimatedCompletionAt: string | null; estimatedSecondsRemaining: number | null } {
  if (status !== "building") {
    return { estimatedCompletionAt: null, estimatedSecondsRemaining: null };
  }

  const remaining = job.totalVideos - job.processedVideos;
  if (remaining <= 0) {
    return { estimatedCompletionAt: new Date().toISOString(), estimatedSecondsRemaining: 0 };
  }

  let secondsPerVideo = KB_BUILD_DEFAULT_SECONDS_PER_VIDEO;
  if (job.processedVideos > 0) {
    const elapsedSec = (Date.now() - new Date(job.startedAt).getTime()) / 1000;
    secondsPerVideo = Math.max(20, elapsedSec / job.processedVideos);
  }

  const estimatedSecondsRemaining = Math.ceil(remaining * secondsPerVideo);
  return {
    estimatedCompletionAt: new Date(Date.now() + estimatedSecondsRemaining * 1000).toISOString(),
    estimatedSecondsRemaining,
  };
}

export function formatKbBuildEta(iso: string | null, locale?: string): string | null {
  if (!iso) return null;
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;

  return when.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatKbBuildRemaining(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  if (seconds < 90) return `~${seconds}s left`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "~1 min left" : `~${minutes} min left`;
}
