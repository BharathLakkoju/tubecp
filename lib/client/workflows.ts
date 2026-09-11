import type {
  ResearchResult,
  KnowledgeBase,
  VideoCandidate,
  VideoAnalysis,
  ResearchLiveState,
} from "@/lib/types";
import { toVideoSummary } from "@/lib/youtube";
import { ANALYZE_LIMIT } from "@/lib/constants/research";

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
  maxVideos = 15,
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

  const toAnalyze = candidates.slice(0, Math.min(candidates.length, ANALYZE_LIMIT));
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
    maxVideos,
    allCandidates: allCandidates ?? candidates,
  });

  onProgress?.(`found ${research.rankedVideos.length} relevant videos`, 100, "ranking");
  return research;
}

export async function buildKnowledgeBase(
  topic: string,
  rankedVideos: ResearchResult["rankedVideos"],
  onProgress?: ProgressCallback
): Promise<KnowledgeBase> {
  onProgress?.("Creating knowledge base...", 5);
  const { kbId } = await postJson<{ kbId: string }>("/api/knowledge-base/create", {
    topic,
    rankedVideos,
  });

  for (let i = 0; i < rankedVideos.length; i++) {
    const video = rankedVideos[i];
    onProgress?.(
      `Indexing "${video.title.slice(0, 50)}..." (${i + 1}/${rankedVideos.length})`,
      10 + Math.round((i / rankedVideos.length) * 85)
    );

    await postJson("/api/knowledge-base/index-video", { kbId, video });
  }

  onProgress?.("Finalizing knowledge base...", 98);
  const { kb } = await postJson<{ kb: KnowledgeBase }>("/api/knowledge-base/finalize", { kbId });

  onProgress?.("Knowledge base ready!", 100);
  return kb;
}
