import type { KnowledgeBase, KnowledgeBaseRecord, RankedVideo, ResearchResult } from "@/lib/types";
import type { KnowledgeBaseBuildStatus } from "@/lib/kb-build-status";
import { kbBuildStartIndex } from "@/lib/kb-build-resume";

export interface SkippedKbVideo {
  videoId: string;
  title: string;
  reason: string;
}

export interface BuildKnowledgeBaseResult {
  kb: KnowledgeBase;
  skippedVideos: SkippedKbVideo[];
}

export type KbBuildProgressCallback = (
  message: string,
  progress?: number,
  status?: KnowledgeBaseBuildStatus
) => void;

const DRIVER_KEY_PREFIX = "tubecp:kb-build-driver:";

function driverKey(kbId: string): string {
  return `${DRIVER_KEY_PREFIX}${kbId}`;
}

export function tryAcquireKbBuildDriver(kbId: string): boolean {
  if (typeof window === "undefined") return true;
  const key = driverKey(kbId);
  if (sessionStorage.getItem(key)) return false;
  sessionStorage.setItem(key, String(Date.now()));
  return true;
}

export function releaseKbBuildDriver(kbId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(driverKey(kbId));
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const code = data.code ? `[${data.code}] ` : "";
    throw new Error(`${code}${data.error ?? `Request failed: ${res.status}`}`);
  }
  return data as T;
}

async function fetchBuildStatus(kbId: string): Promise<KnowledgeBaseBuildStatus> {
  const res = await fetch(`/api/knowledge-base/${kbId}/build-status`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Build status failed: ${res.status}`);
  }
  return data as KnowledgeBaseBuildStatus;
}

async function fetchKbRecord(kbId: string): Promise<KnowledgeBaseRecord> {
  const res = await fetch(`/api/knowledge-base/${kbId}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to load knowledge base");
  }
  return data as KnowledgeBaseRecord;
}

async function indexRankedVideosForKb(
  kbId: string,
  rankedVideos: RankedVideo[],
  startIndex: number,
  onProgress?: KbBuildProgressCallback
): Promise<SkippedKbVideo[]> {
  const skippedVideos: SkippedKbVideo[] = [];
  const total = rankedVideos.length;

  for (let i = startIndex; i < total; i++) {
    const video = rankedVideos[i];
    onProgress?.(
      `${video.title.slice(0, 72)}${video.title.length > 72 ? "…" : ""} · ${i + 1}/${total}`,
      10 + Math.round((i / total) * 85)
    );

    const result = await postJson<{
      kb: KnowledgeBase;
      skipped?: boolean;
      skipReason?: string;
      videoId?: string;
      videoTitle?: string;
    }>("/api/knowledge-base/index-video", { kbId, video });

    // Reduce YouTube transcript rate limits when indexing many videos in a row.
    if (i + 1 < total) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    try {
      const status = await fetchBuildStatus(kbId);
      onProgress?.(status.currentVideoTitle ?? video.title, status.progress, status);
    } catch {
      // Non-fatal — indexing already succeeded for this video.
    }

    if (result.skipped) {
      const reason =
        result.skipReason ??
        `"${video.title}" skipped — transcript unavailable for this video.`;
      skippedVideos.push({
        videoId: result.videoId ?? video.videoId,
        title: result.videoTitle ?? video.title,
        reason,
      });
    }
  }

  return skippedVideos;
}

async function finalizeKbOnServer(
  kbId: string,
  onProgress?: KbBuildProgressCallback
): Promise<KnowledgeBase> {
  onProgress?.("Wrapping up and saving your knowledge base", 98);
  const { kb } = await postJson<{ kb: KnowledgeBase }>("/api/knowledge-base/finalize", { kbId });
  return kb;
}

function finishBuildProgress(
  skippedVideos: SkippedKbVideo[],
  onProgress?: KbBuildProgressCallback
): void {
  if (skippedVideos.length > 0) {
    onProgress?.(
      `Knowledge base ready (${skippedVideos.length} video${skippedVideos.length === 1 ? "" : "s"} skipped — no transcript).`,
      100
    );
  } else {
    onProgress?.("Knowledge base ready!", 100);
  }
}

export async function continueKnowledgeBaseBuild(
  kbId: string,
  onProgress?: KbBuildProgressCallback
): Promise<BuildKnowledgeBaseResult> {
  if (!tryAcquireKbBuildDriver(kbId)) {
    throw new Error("Another tab is already indexing this knowledge base.");
  }

  try {
    return await continueKnowledgeBaseBuildInner(kbId, onProgress);
  } finally {
    releaseKbBuildDriver(kbId);
  }
}

async function continueKnowledgeBaseBuildInner(
  kbId: string,
  onProgress?: KbBuildProgressCallback
): Promise<BuildKnowledgeBaseResult> {
  const record = await fetchKbRecord(kbId);
  if (!record.rankedVideos?.length) {
    throw new Error("This knowledge base cannot be resumed because source videos were not saved.");
  }

  const total = record.rankedVideos.length;
  const startIndex = kbBuildStartIndex(record);

  if (record.status === "ready") {
    return { kb: record, skippedVideos: [] };
  }

  if (record.status === "failed") {
    throw new Error("This knowledge base failed. Use retry from the failed state.");
  }

  if (
    startIndex === 0 &&
    (record.buildJob?.processedVideos ?? 0) > 0 &&
    record.chunkIds.length === 0
  ) {
    await postJson(`/api/knowledge-base/${kbId}/reset-build-progress`, {});
  }

  const skippedVideos =
    startIndex >= total
      ? []
      : await indexRankedVideosForKb(kbId, record.rankedVideos, startIndex, onProgress);

  const kb = await finalizeKbOnServer(kbId, onProgress);

  if (kb.status === "failed") {
    throw buildAllVideosSkippedError(skippedVideos, record.buildJob?.skippedCount);
  }

  finishBuildProgress(skippedVideos, onProgress);
  return { kb, skippedVideos };
}

function buildAllVideosSkippedError(
  skippedVideos: SkippedKbVideo[],
  skippedCount?: number
): Error {
  const count = skippedVideos.length || skippedCount;
  const sample = skippedVideos[0]?.reason;
  const detail =
    count && count > 0
      ? `${count} video${count === 1 ? "" : "s"} could not be indexed (missing transcript or fetch failed).`
      : "No videos could be indexed. Every selected video was missing a transcript or failed to index.";
  const hint = sample ? ` Example: ${sample}` : "";
  return new Error(`${detail}${hint}`);
}

export async function buildKnowledgeBaseFromClient(
  topic: string,
  rankedVideos: ResearchResult["rankedVideos"],
  onProgress?: KbBuildProgressCallback,
  options?: {
    onKnowledgeBaseCreated?: (kbId: string) => void;
    useSpeechToText?: boolean;
  }
): Promise<BuildKnowledgeBaseResult> {
  onProgress?.("Preparing knowledge base", 5);

  const { kbId } = await postJson<{ kbId: string }>("/api/knowledge-base/create", {
    topic,
    rankedVideos,
    transcriptMode: options?.useSpeechToText ? "stt" : "captions",
  });
  options?.onKnowledgeBaseCreated?.(kbId);

  if (!tryAcquireKbBuildDriver(kbId)) {
    throw new Error("Another tab is already indexing this knowledge base.");
  }

  try {
    const skippedVideos = await indexRankedVideosForKb(kbId, rankedVideos, 0, onProgress);
    const kb = await finalizeKbOnServer(kbId, onProgress);

    if (kb.status === "failed") {
      throw buildAllVideosSkippedError(skippedVideos);
    }

    finishBuildProgress(skippedVideos, onProgress);
    return { kb, skippedVideos };
  } finally {
    releaseKbBuildDriver(kbId);
  }
}

export async function runKbBuildDriverIfNeeded(
  kbId: string,
  onProgress?: KbBuildProgressCallback
): Promise<BuildKnowledgeBaseResult | null> {
  const status = await fetchBuildStatus(kbId);
  if (status.status !== "building") return null;
  if (!tryAcquireKbBuildDriver(kbId)) return null;

  try {
    return await continueKnowledgeBaseBuildInner(kbId, onProgress);
  } finally {
    releaseKbBuildDriver(kbId);
  }
}
