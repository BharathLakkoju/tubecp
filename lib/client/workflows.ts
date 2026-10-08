import type {
  ResearchResult,
  KnowledgeBase,
  VideoCandidate,
  VideoAnalysis,
  ResearchLiveState,
} from "@/lib/types";
import type { ResearchCheckpoint } from "@/lib/research-session";
import { mapWithConcurrency } from "@/lib/concurrency";
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

const ANALYSIS_CONCURRENCY = 4;

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

async function getCheckpoint(researchSessionId: string): Promise<ResearchCheckpoint | null> {
  const res = await fetch(
    `/api/research/checkpoint?researchSessionId=${encodeURIComponent(researchSessionId)}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.checkpoint ?? null;
}

export type RunResearchResult = {
  research: ResearchResult;
  researchSessionId: string;
};

export async function runResearch(
  topic: string,
  onProgress?: ProgressCallback,
  resumeSessionId?: string
): Promise<RunResearchResult> {
  if (resumeSessionId) {
    const checkpoint = await getCheckpoint(resumeSessionId);
    if (checkpoint?.stage === "ranked" && checkpoint.result) {
      onProgress?.(`found ${checkpoint.result.rankedVideos.length} relevant videos (resumed)`, 100, "ranking");
      return { research: checkpoint.result, researchSessionId: resumeSessionId };
    }

    if (checkpoint && checkpoint.topic === topic && checkpoint.stage !== "expanded") {
      return resumeFromCheckpoint(topic, resumeSessionId, checkpoint, onProgress);
    }
  }

  onProgress?.("expanding", 5, "expanding");
  const expandRes = await postJson<{
    queries: string[];
    researchSessionId: string;
    cached?: boolean;
    research?: ResearchResult;
  }>("/api/research/expand", { topic });

  if (expandRes.research) {
    onProgress?.("expanded", 10, "expanding", { queries: expandRes.research.queriesUsed });
    onProgress?.(
      `found ${expandRes.research.rankedVideos.length} relevant videos (cached)`,
      100,
      "ranking",
      {
        queries: expandRes.research.queriesUsed,
        allVideos: expandRes.research.allVideos,
        analyzedVideos: expandRes.research.rankedVideos.map((video) => ({
          videoId: video.videoId,
          title: video.title,
          channel: video.channel,
          url: video.url,
          thumbnailUrl: video.thumbnailUrl,
        })),
        analyzedScores: Object.fromEntries(
          expandRes.research.rankedVideos.map((video) => [video.videoId, video.relevanceScore])
        ),
      }
    );
    return { research: expandRes.research, researchSessionId: expandRes.researchSessionId };
  }

  const { queries, researchSessionId } = expandRes;
  return continueResearch(topic, researchSessionId, queries, onProgress);
}

async function resumeFromCheckpoint(
  topic: string,
  researchSessionId: string,
  checkpoint: ResearchCheckpoint,
  onProgress?: ProgressCallback
): Promise<RunResearchResult> {
  if (checkpoint.stage === "searched" && checkpoint.queries && checkpoint.candidates) {
    onProgress?.("resuming from search", 18, "searching", {
      queries: checkpoint.queries,
      allVideos: (checkpoint.allCandidates ?? []).map(toVideoSummary),
    });
    return analyzeAndRank(
      topic,
      researchSessionId,
      checkpoint.queries,
      checkpoint.candidates,
      checkpoint.allCandidates ?? checkpoint.candidates,
      checkpoint.videosSearched ?? checkpoint.candidates.length,
      checkpoint.analyses ?? [],
      onProgress
    );
  }

  if (checkpoint.stage === "analyzed" && checkpoint.queries && checkpoint.analyses) {
    onProgress?.("resuming from analysis", 85, "analyzing");
    return rankOnly(
      topic,
      researchSessionId,
      checkpoint.queries,
      checkpoint.analyses,
      checkpoint.allCandidates ?? [],
      checkpoint.videosSearched ?? checkpoint.analyses.length,
      onProgress
    );
  }

  if (checkpoint.queries) {
    return continueResearch(topic, researchSessionId, checkpoint.queries, onProgress);
  }

  return runResearch(topic, onProgress);
}

async function continueResearch(
  topic: string,
  researchSessionId: string,
  queries: string[],
  onProgress?: ProgressCallback
): Promise<RunResearchResult> {
  onProgress?.("expanded", 10, "expanding", { queries });

  onProgress?.("searching", 15, "searching");
  const { candidates, allCandidates, videosSearched } = await postJson<{
    candidates: VideoCandidate[];
    allCandidates: VideoCandidate[];
    videosSearched: number;
  }>("/api/research/search", { topic, queries, researchSessionId });

  const scraped = (allCandidates ?? []).map(toVideoSummary);
  onProgress?.("searched", 18, "searching", { allVideos: scraped });

  if (candidates.length === 0) {
    return {
      research: {
        topic,
        queriesUsed: queries,
        videosSearched: videosSearched ?? 0,
        allVideos: scraped,
        rankedVideos: [],
      },
      researchSessionId,
    };
  }

  return analyzeAndRank(
    topic,
    researchSessionId,
    queries,
    candidates,
    allCandidates ?? candidates,
    videosSearched ?? candidates.length,
    [],
    onProgress
  );
}

async function analyzeAndRank(
  topic: string,
  researchSessionId: string,
  queries: string[],
  candidates: VideoCandidate[],
  allCandidates: VideoCandidate[],
  videosSearched: number,
  existingAnalyses: Array<{ video: VideoCandidate; analysis: VideoAnalysis }>,
  onProgress?: ProgressCallback
): Promise<RunResearchResult> {
  const completedIds = new Set(existingAnalyses.map((item) => item.video.videoId));
  const pending = candidates.filter((video) => !completedIds.has(video.videoId));

  let analyzedCount = existingAnalyses.length;
  const analyses = [...existingAnalyses];
  const completedInFlight: Array<{ video: VideoCandidate; analysis: VideoAnalysis }> = [];

  const newAnalyses = await mapWithConcurrency(pending, ANALYSIS_CONCURRENCY, async (video) => {
    analyzedCount += 1;
    onProgress?.(
      `"${video.title.slice(0, 50)}…" (${analyzedCount}/${candidates.length})`,
      20 + Math.round((analyzedCount / candidates.length) * 65),
      "analyzing"
    );

    try {
      const result = await postJson<{ video: VideoCandidate; analysis: VideoAnalysis }>(
        "/api/research/analyze",
        {
          video,
          topic,
          researchSessionId,
        }
      );

      completedInFlight.push(result);
      const completed = [...analyses, ...completedInFlight];
      onProgress?.(
        `analyzed ${completed.length}/${candidates.length} videos`,
        20 + Math.round((analyzedCount / candidates.length) * 65),
        "analyzing",
        {
          analyzedVideos: completed.map(({ video: item }) => toVideoSummary(item)),
          analyzedScores: Object.fromEntries(
            completed.map(({ video: item, analysis }) => [item.videoId, analysis.relevanceScore])
          ),
        }
      );

      return result;
    } catch {
      return null;
    }
  });

  const successful = newAnalyses.filter(
    (entry): entry is { video: VideoCandidate; analysis: VideoAnalysis } => entry !== null
  );
  analyses.push(...successful);

  if (analyses.length === 0) {
    throw new Error("RESEARCH_FAILED");
  }

  return rankOnly(topic, researchSessionId, queries, analyses, allCandidates, videosSearched, onProgress);
}

async function rankOnly(
  topic: string,
  researchSessionId: string,
  queries: string[],
  analyses: Array<{ video: VideoCandidate; analysis: VideoAnalysis }>,
  allCandidates: VideoCandidate[],
  videosSearched: number,
  onProgress?: ProgressCallback
): Promise<RunResearchResult> {
  const analyzedVideos = analyses.map(({ video }) => toVideoSummary(video));
  const analyzedScores = Object.fromEntries(
    analyses.map(({ video, analysis }) => [video.videoId, analysis.relevanceScore])
  );
  onProgress?.(`analyzed ${analyses.length} videos`, 85, "analyzing", {
    analyzedVideos,
    analyzedScores,
  });

  onProgress?.("ranking", 90, "ranking");
  const research = await postJson<ResearchResult>("/api/research/rank", {
    topic,
    queriesUsed: queries,
    videosSearched,
    analyses,
    allCandidates,
    researchSessionId,
  });

  onProgress?.(`found ${research.rankedVideos.length} relevant videos`, 100, "ranking");
  return { research, researchSessionId };
}

export type { BuildKnowledgeBaseResult, SkippedKbVideo } from "@/lib/client/kb-build";
export {
  buildKnowledgeBaseFromClient,
  continueKnowledgeBaseBuild,
  runKbBuildDriverIfNeeded,
} from "@/lib/client/kb-build";

export async function buildKnowledgeBase(
  topic: string,
  rankedVideos: ResearchResult["rankedVideos"],
  onProgress?: ProgressCallback,
  options?: { onKnowledgeBaseCreated?: (kbId: string) => void }
): Promise<import("@/lib/client/kb-build").BuildKnowledgeBaseResult> {
  const { buildKnowledgeBaseFromClient } = await import("@/lib/client/kb-build");
  return buildKnowledgeBaseFromClient(
    topic,
    rankedVideos,
    (message, progress) => {
      onProgress?.(message, progress);
    },
    options
  );
}
