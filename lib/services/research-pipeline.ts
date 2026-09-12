import { expandQueries } from "./query-expansion";
import { searchYouTubeMultiple } from "./youtube-search";
import { analyzeVideo, rankVideos, preRankCandidates } from "./relevance";
import { selectCandidatesForAnalysis } from "./research-scoring";
import { getResearchPipelineLimits } from "../research-limits";
import type { ResearchResult, VideoCandidate, VideoAnalysis } from "../types";
import type { PlanId } from "../plans";

export type ResearchProgress = {
  stage: string;
  message: string;
  progress?: number;
};

export async function runResearchPipeline(
  topic: string,
  options?: {
    planId?: PlanId;
    maxVideos?: number;
    onProgress?: (p: ResearchProgress) => void;
  }
): Promise<ResearchResult> {
  const limits = getResearchPipelineLimits(options?.planId);
  const maxResults = options?.maxVideos ?? limits.maxResults;
  const onProgress = options?.onProgress ?? (() => {});

  onProgress({ stage: "expanding", message: "Generating search queries...", progress: 5 });
  const queries = await expandQueries(topic, { maxQueries: limits.search.maxExpandedQueries });

  onProgress({ stage: "searching", message: "Searching YouTube...", progress: 12 });
  const allCandidates = await searchYouTubeMultiple(queries, undefined, limits.search);

  if (allCandidates.length === 0) {
    return { topic, queriesUsed: queries, videosSearched: 0, allVideos: [], rankedVideos: [] };
  }

  onProgress({
    stage: "preranking",
    message: `Pre-ranking ${allCandidates.length} candidates by relevance...`,
    progress: 20,
  });

  const preRanked =
    allCandidates.length <= limits.preRankLimit
      ? allCandidates
      : await preRankCandidates(topic, allCandidates, limits.preRankLimit);

  const toAnalyze = selectCandidatesForAnalysis(topic, preRanked, limits);
  const analyses: Array<{ video: VideoCandidate; analysis: VideoAnalysis }> = [];

  for (let i = 0; i < toAnalyze.length; i++) {
    const video = toAnalyze[i];
    onProgress({
      stage: "analyzing",
      message: `Analyzing "${video.title.slice(0, 50)}..." (${i + 1}/${toAnalyze.length})`,
      progress: 25 + Math.round((i / toAnalyze.length) * 65),
    });
    const analysis = await analyzeVideo(video, topic);
    analyses.push({ video, analysis });
  }

  onProgress({ stage: "ranking", message: "Ranking videos by relevance...", progress: 95 });

  const result = rankVideos(
    topic,
    queries,
    allCandidates.length,
    analyses,
    maxResults,
    allCandidates
  );

  onProgress({
    stage: "complete",
    message: `Found ${result.rankedVideos.length} relevant videos`,
    progress: 100,
  });

  return result;
}
