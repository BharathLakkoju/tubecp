import type { KnowledgeBase } from "@/lib/types";
import type { KnowledgeBaseBuildStatus } from "@/lib/kb-build-status";
import { isKbBuildStatusStale } from "@/lib/kb-build-stale";
import type { BuildKnowledgeBaseResult, SkippedKbVideo } from "@/lib/client/kb-build";
import { parseJsonResponseBody } from "@/lib/client/fetch-json";

function buildPollDeadlineMs(videoCount: number): number {
  const perVideoMs = 6 * 60 * 1000;
  const minMs = 15 * 60 * 1000;
  return Math.max(minMs, videoCount * perVideoMs);
}

export async function pollKnowledgeBaseBuild(
  kbId: string,
  options?: {
    videoCount?: number;
    onProgress?: (message: string, progress?: number, status?: KnowledgeBaseBuildStatus) => void;
  }
): Promise<{ kb: KnowledgeBase; skippedCount: number; error?: string }> {
  const deadline = Date.now() + buildPollDeadlineMs(options?.videoCount ?? 10);
  let lastKickAt = 0;

  while (Date.now() < deadline) {
    const res = await fetch(`/api/knowledge-base/${kbId}/build-status`);
    const status = await parseJsonResponseBody<KnowledgeBaseBuildStatus & { error?: string }>(res);

    if (!res.ok) {
      throw new Error(status.error ?? `Build status failed: ${res.status}`);
    }

    const detail = status.currentVideoTitle
      ? `Indexing "${status.currentVideoTitle.slice(0, 48)}${status.currentVideoTitle.length > 48 ? "…" : ""}"`
      : "Indexing videos on server";
    options?.onProgress?.(detail, Math.max(10, status.progress), status);

    if (status.status === "ready" || status.status === "failed") {
      const kbRes = await fetch(`/api/knowledge-base/${kbId}`);
      const kb = await parseJsonResponseBody<KnowledgeBase & { error?: string }>(kbRes);
      if (!kbRes.ok) {
        throw new Error(kb.error ?? "Failed to load knowledge base");
      }
      return { kb, skippedCount: status.skippedCount ?? 0, error: status.error };
    }

    if (isKbBuildStatusStale(status) && Date.now() - lastKickAt > 30_000) {
      lastKickAt = Date.now();
      await fetch(`/api/knowledge-base/${kbId}/kick-build`, { method: "POST" }).catch(() => undefined);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(
    "Knowledge base build timed out. Open the knowledge base from your library to check progress or retry."
  );
}

export function kbBuildFailureMessage(error: string | undefined, skippedCount: number): string {
  const detail = error?.trim();
  if (detail) return detail;
  if (skippedCount > 0) {
    return (
      skippedVideosFromCount(skippedCount)[0]?.reason ??
      "Some videos were skipped."
    );
  }
  return "Knowledge base build failed. Retry to continue from the last saved video.";
}

export function skippedVideosFromCount(count: number): SkippedKbVideo[] {
  if (count <= 0) return [];
  return [
    {
      videoId: "",
      title: "",
      reason: `${count} video${count === 1 ? "" : "s"} skipped — transcript unavailable or indexing failed.`,
    },
  ];
}

export async function buildKnowledgeBaseOnServer(
  topic: string,
  rankedVideos: { videoId: string }[],
  options?: {
    useSpeechToText?: boolean;
    onKnowledgeBaseCreated?: (kbId: string) => void;
    onProgress?: (message: string, progress?: number, status?: KnowledgeBaseBuildStatus) => void;
  }
): Promise<BuildKnowledgeBaseResult> {
  options?.onProgress?.("Preparing knowledge base", 5);

  const res = await fetch("/api/knowledge-base/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      rankedVideos,
      transcriptMode: options?.useSpeechToText ? "stt" : "captions",
    }),
  });
  const data = await parseJsonResponseBody<{
    code?: string;
    error?: string;
    kb: KnowledgeBase;
    skippedVideos?: SkippedKbVideo[];
    async?: boolean;
  }>(res);

  if (!res.ok) {
    const code = data.code ? `[${data.code}] ` : "";
    throw new Error(`${code}${data.error ?? `Request failed: ${res.status}`}`);
  }

  const payload = data as {
    kb: KnowledgeBase;
    skippedVideos?: SkippedKbVideo[];
    async?: boolean;
  };

  options?.onKnowledgeBaseCreated?.(payload.kb.kbId);

  if (payload.kb.status === "ready" && !payload.async) {
    options?.onProgress?.("Knowledge base ready!", 100);
    return { kb: payload.kb, skippedVideos: payload.skippedVideos ?? [] };
  }

  const { kb, skippedCount, error } = await pollKnowledgeBaseBuild(payload.kb.kbId, {
    videoCount: rankedVideos.length,
    onProgress: options?.onProgress,
  });

  const skippedVideos =
    payload.skippedVideos?.length ? payload.skippedVideos : skippedVideosFromCount(skippedCount);

  if (kb.status === "failed") {
    throw new Error(kbBuildFailureMessage(error ?? kb.buildJob?.error, skippedCount));
  }

  options?.onProgress?.("Knowledge base ready!", 100);
  return { kb, skippedVideos };
}
