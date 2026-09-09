import type { ResearchResult, KnowledgeBase, VideoCandidate, VideoAnalysis } from "@/lib/types";
import { ANALYZE_LIMIT } from "@/lib/constants/research";

export type ProgressCallback = (message: string, progress?: number) => void;

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
  onProgress?.("Generating search queries...", 5);
  const { queries } = await postJson<{ queries: string[] }>("/api/research/expand", { topic });

  onProgress?.("Searching YouTube...", 15);
  const { candidates, videosSearched } = await postJson<{
    candidates: VideoCandidate[];
    videosSearched: number;
  }>("/api/research/search", { topic, queries });

  if (candidates.length === 0) {
    return { topic, queriesUsed: queries, videosSearched: videosSearched ?? 0, rankedVideos: [] };
  }

  const toAnalyze = candidates.slice(0, Math.min(candidates.length, ANALYZE_LIMIT));
  const analyses: Array<{ video: VideoCandidate; analysis: VideoAnalysis }> = [];

  for (let i = 0; i < toAnalyze.length; i++) {
    const video = toAnalyze[i];
    onProgress?.(
      `Analyzing "${video.title.slice(0, 50)}..." (${i + 1}/${toAnalyze.length})`,
      20 + Math.round((i / toAnalyze.length) * 65)
    );

    const result = await postJson<{ video: VideoCandidate; analysis: VideoAnalysis }>(
      "/api/research/analyze",
      { video, topic }
    );
    analyses.push(result);
  }

  onProgress?.("Ranking videos by relevance...", 90);
  const research = await postJson<ResearchResult>("/api/research/rank", {
    topic,
    queriesUsed: queries,
    videosSearched: videosSearched ?? candidates.length,
    analyses,
    maxVideos,
  });

  onProgress?.(`Found ${research.rankedVideos.length} relevant videos`, 100);
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
