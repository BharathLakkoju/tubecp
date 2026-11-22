import { mapWithConcurrency } from "../concurrency";
import { expandQueries } from "./query-expansion";
import { searchYouTubeMultiple } from "./youtube-search";
import { analyzeVideo, rankVideos, preRankCandidates } from "./relevance";
import { selectCandidatesForAnalysis } from "./research-scoring";
import { getResearchPipelineLimits } from "../research-limits";
import { toVideoSummary } from "../youtube";
import type { ResearchResult, VideoSummary } from "../types";
import type { PlanId } from "../plans";

export type ResearchProgress = {
  stage: string;
  message: string;
  progress?: number;
  queries?: string[];
  allVideos?: VideoSummary[];
  analyzedVideos?: VideoSummary[];
  analyzedScores?: Record<string, number>;
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
  const { queries } = await expandQueries(topic, { maxQueries: limits.search.maxExpandedQueries });
  onProgress({
    stage: "expanding",
    message: "Generating search queries...",
    progress: 10,
    queries,
  });

  onProgress({ stage: "searching", message: "Searching YouTube...", progress: 12, queries });
  const allCandidates = await searchYouTubeMultiple(queries, undefined, limits.search);
  const allVideos = allCandidates.map(toVideoSummary);

  if (allCandidates.length === 0) {
    return { topic, queriesUsed: queries, videosSearched: 0, allVideos: [], rankedVideos: [] };
  }

  onProgress({
    stage: "preranking",
    message: `Pre-ranking ${allCandidates.length} candidates by relevance...`,
    progress: 20,
    queries,
    allVideos,
  });

  const preRanked =
    allCandidates.length <= limits.preRankLimit
      ? allCandidates
      : await preRankCandidates(topic, allCandidates, limits.preRankLimit);

  const toAnalyze = selectCandidatesForAnalysis(topic, preRanked, limits);
  let analyzedCount = 0;
  const analyzedVideos: VideoSummary[] = [];
  const analyzedScores: Record<string, number> = {};

  const analyses = await mapWithConcurrency(toAnalyze, 4, async (video) => {
    analyzedCount += 1;
    const analysis = await analyzeVideo(video, topic);
    analyzedVideos.push(toVideoSummary(video));
    analyzedScores[video.videoId] = analysis.relevanceScore;
    onProgress({
      stage: "analyzing",
      message: `Analyzing "${video.title.slice(0, 50)}..." (${analyzedCount}/${toAnalyze.length})`,
      progress: 25 + Math.round((analyzedCount / toAnalyze.length) * 65),
      queries,
      allVideos,
      analyzedVideos: [...analyzedVideos],
      analyzedScores: { ...analyzedScores },
    });
    return { video, analysis };
  });

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
