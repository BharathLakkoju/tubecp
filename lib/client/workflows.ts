import type {
  ResearchResult,
  KnowledgeBase,
  VideoCandidate,
  VideoAnalysis,
  ResearchLiveState,
} from "@/lib/types";
import { toVideoSummary } from "@/lib/youtube";

export type ResearchStage = "expanding" | "searching" | "analyzing" | "ranking";

export type ResearchLiveUpdate = Partial<ResearchLiveState>;

export type ProgressCallback = (
  message: string,
  progress?: number,
  stage?: ResearchStage,
  live?: ResearchLiveUpdate
) => void;

export const emptyLiveResearch = (): ResearchLiveState => ({
  queries: [],
  allVideos: [],
  analyzedVideos: [],
  analyzedScores: {},
});

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

export async function runResearch(
  topic: string,
  onProgress?: ProgressCallback
): Promise<ResearchResult> {
  onProgress?.("expanding", 5, "expanding");
  const { queries } = await postJson<{ queries: string[] }>("/api/research/expand", { topic });
  onProgress?.("expanded", 10, "expanding", { queries });

  onProgress?.("searching", 15, "searching");
  const { candidates, allCandidates, videosSearched } = await postJson<{
    candidates: VideoCandidate[];
    allCandidates: VideoCandidate[];
    videosSearched: number;
  }>("/api/research/search", { topic, queries });

  const scraped = (allCandidates ?? []).map(toVideoSummary);
  onProgress?.("searched", 18, "searching", { allVideos: scraped });

  if (candidates.length === 0) {
    return {
      topic,
      queriesUsed: queries,
      videosSearched: videosSearched ?? 0,
      allVideos: scraped,
      rankedVideos: [],
    };
  }

  const toAnalyze = candidates;
  const analyses: Array<{ video: VideoCandidate; analysis: VideoAnalysis }> = [];

  for (let i = 0; i < toAnalyze.length; i++) {
    const video = toAnalyze[i];
    onProgress?.(
      `"${video.title.slice(0, 50)}…" (${i + 1}/${toAnalyze.length})`,
      20 + Math.round((i / toAnalyze.length) * 65),
      "analyzing"
    );

    const result = await postJson<{ video: VideoCandidate; analysis: VideoAnalysis }>(
      "/api/research/analyze",
      { video, topic }
    );
    analyses.push(result);

    const analyzedVideos = analyses.map(({ video: v }) => toVideoSummary(v));
    const analyzedScores = Object.fromEntries(
      analyses.map(({ video: v, analysis }) => [v.videoId, analysis.relevanceScore])
    );
    onProgress?.(
      `"${video.title.slice(0, 50)}…" (${i + 1}/${toAnalyze.length})`,
      20 + Math.round(((i + 1) / toAnalyze.length) * 65),
      "analyzing",
      { analyzedVideos, analyzedScores }
    );
  }

  onProgress?.("ranking", 90, "ranking");
  const research = await postJson<ResearchResult>("/api/research/rank", {
    topic,
    queriesUsed: queries,
    videosSearched: videosSearched ?? allCandidates?.length ?? candidates.length,
    analyses,
    allCandidates: allCandidates ?? candidates,
  });

  onProgress?.(`found ${research.rankedVideos.length} relevant videos`, 100, "ranking");
  return research;
}

export interface SkippedKbVideo {
  videoId: string;
  title: string;
  reason: string;
}

export interface BuildKnowledgeBaseResult {
  kb: KnowledgeBase;
  skippedVideos: SkippedKbVideo[];
}

export async function buildKnowledgeBase(
  topic: string,
  rankedVideos: ResearchResult["rankedVideos"],
  onProgress?: ProgressCallback
): Promise<BuildKnowledgeBaseResult> {
  onProgress?.("Preparing knowledge base", 5);
  const { kbId } = await postJson<{ kbId: string }>("/api/knowledge-base/create", {
    topic,
    rankedVideos,
  });

  const skippedVideos: SkippedKbVideo[] = [];

  for (let i = 0; i < rankedVideos.length; i++) {
    const video = rankedVideos[i];
    onProgress?.(
      `${video.title.slice(0, 72)}${video.title.length > 72 ? "…" : ""} · ${i + 1}/${rankedVideos.length}`,
      10 + Math.round((i / rankedVideos.length) * 85)
    );

    const result = await postJson<{
      kb: KnowledgeBase;
      skipped?: boolean;
      skipReason?: string;
      videoId?: string;
      videoTitle?: string;
    }>("/api/knowledge-base/index-video", { kbId, video });

    if (result.skipped) {
      const reason =
        result.skipReason ??
        `"${video.title}" skipped — transcript unavailable for this video.`;
      skippedVideos.push({
        videoId: result.videoId ?? video.videoId,
        title: result.videoTitle ?? video.title,
        reason,
      });
      onProgress?.(reason, 10 + Math.round((i / rankedVideos.length) * 85));
    }
  }

  onProgress?.("Wrapping up and saving your knowledge base", 98);
  const { kb } = await postJson<{ kb: KnowledgeBase }>("/api/knowledge-base/finalize", { kbId });

  if (skippedVideos.length > 0) {
    onProgress?.(
      `Knowledge base ready (${skippedVideos.length} video${skippedVideos.length === 1 ? "" : "s"} skipped — no transcript).`,
      100
    );
  } else {
    onProgress?.("Knowledge base ready!", 100);
  }

  return { kb, skippedVideos };
}
