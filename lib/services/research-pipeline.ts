import { mapWithConcurrency } from "../concurrency";
import { expandQueries, tagSearchQueries } from "./query-expansion";
import { searchYouTubeMultiple } from "./youtube-search";
import { queueForReading } from "./recall";
import { assessVideo, orderSelection } from "./selection";
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
  const tagged = tagSearchQueries(topic, queries);
  const allCandidates = await searchYouTubeMultiple(
    tagged.map((query) => query.text),
    undefined,
    limits.search,
    undefined,
    { queryKinds: tagged.map((query) => query.kind) }
  );
  const allVideos = allCandidates.map(toVideoSummary);

  if (allCandidates.length === 0) {
    return { topic, queriesUsed: queries, videosSearched: 0, allVideos: [], rankedVideos: [] };
  }

  const queue = queueForReading(allCandidates, limits);
  let analyzedCount = 0;
  const analyzedVideos: VideoSummary[] = [];

  const assessments = await mapWithConcurrency(queue.toRead, 4, async (video) => {
    analyzedCount += 1;
    const state = await assessVideo(video, topic);
    analyzedVideos.push(toVideoSummary(video));
    onProgress({
      stage: "analyzing",
      message: `Reading "${video.title.slice(0, 50)}..." (${analyzedCount}/${queue.toRead.length})`,
      progress: 25 + Math.round((analyzedCount / queue.toRead.length) * 65),
      queries,
      allVideos,
      analyzedVideos: [...analyzedVideos],
    });
    return state;
  });

  onProgress({ stage: "ranking", message: "Selecting videos by transcript...", progress: 95 });

  const result = orderSelection({
    topic,
    queriesUsed: queries,
    videosSearched: allCandidates.length,
    allVideos,
    assessments,
    pastAnalyzeCap: queue.pastAnalyzeCap,
    pastSearchCap: queue.pastSearchCap,
    maxResults,
  });

  onProgress({
    stage: "complete",
    message: `Found ${result.rankedVideos.length} relevant videos`,
    progress: 100,
  });

  return result;
}
