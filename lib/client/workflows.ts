import type {
  ResearchResult,
  KnowledgeBase,
  VideoCandidate,
  ResearchLiveState,
} from "@/lib/types";
import type { VideoState } from "@/lib/services/selection";
import type { ResearchCheckpoint } from "@/lib/research-session";
import { mapWithConcurrency } from "@/lib/concurrency";
import { parseJsonResponseBody } from "@/lib/client/fetch-json";
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
  const data = await parseJsonResponseBody<T & { code?: string; error?: string }>(res);
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
  const data = await parseJsonResponseBody<{ checkpoint?: ResearchCheckpoint }>(res);
  return data.checkpoint ?? null;
}

export type RunResearchResult = {
  research: ResearchResult;
  researchSessionId: string;
};

export async function runResearch(
  topic: string,
  onProgress?: ProgressCallback,
  resumeSessionId?: string,
  onResearchSession?: (researchSessionId: string) => void
): Promise<RunResearchResult> {
  if (resumeSessionId) {
    const checkpoint = await getCheckpoint(resumeSessionId);
    if (checkpoint?.stage === "ranked" && checkpoint.result) {
      onProgress?.(`found ${checkpoint.result.rankedVideos.length} relevant videos (resumed)`, 100, "ranking");
      return { research: checkpoint.result, researchSessionId: resumeSessionId };
    }

    if (checkpoint && checkpoint.topic === topic && checkpoint.stage !== "expanded") {
      onResearchSession?.(resumeSessionId);
      return resumeFromCheckpoint(
        topic,
        resumeSessionId,
        checkpoint,
        onProgress,
        onResearchSession
      );
    }
  }

  onProgress?.("expanding", 5, "expanding");
  const expanded = await postJson<{
    queries: string[];
    researchSessionId: string;
    cached?: boolean;
    research?: ResearchResult;
  }>("/api/research/expand", { topic });
  onResearchSession?.(expanded.researchSessionId);

  if (expanded.research?.rankedVideos?.length) {
    onProgress?.(
      `found ${expanded.research.rankedVideos.length} relevant videos`,
      100,
      "ranking",
      {
        queries: expanded.research.queriesUsed,
        allVideos: expanded.research.allVideos,
      }
    );
    return { research: expanded.research, researchSessionId: expanded.researchSessionId };
  }

  if (!expanded.queries?.length) {
    throw new Error("Research did not produce search queries");
  }

  return continueResearch(topic, expanded.researchSessionId, expanded.queries, onProgress);
}

async function resumeFromCheckpoint(
  topic: string,
  researchSessionId: string,
  checkpoint: ResearchCheckpoint,
  onProgress?: ProgressCallback,
  onResearchSession?: (researchSessionId: string) => void
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
    checkpoint.states ?? [],
    onProgress
  );
  }

  if (checkpoint.stage === "analyzed" && checkpoint.queries && checkpoint.states) {
    onProgress?.("resuming from analysis", 85, "analyzing");
    return rankOnly(
      topic,
      researchSessionId,
      checkpoint.queries,
      checkpoint.states,
      checkpoint.allCandidates ?? [],
      checkpoint.videosSearched ?? checkpoint.states.length,
      onProgress
    );
  }

  if (checkpoint.queries) {
    return continueResearch(topic, researchSessionId, checkpoint.queries, onProgress);
  }

  return runResearch(topic, onProgress, undefined, onResearchSession);
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
  existingStates: VideoState[],
  onProgress?: ProgressCallback
): Promise<RunResearchResult> {
  const completedIds = new Set(existingStates.map((item) => item.video.videoId));
  const pending = candidates.filter((video) => !completedIds.has(video.videoId));

  let analyzedCount = existingStates.length;
  const states = [...existingStates];

  const newStates = await mapWithConcurrency(pending, ANALYSIS_CONCURRENCY, async (video) => {
    analyzedCount += 1;
    onProgress?.(
      `"${video.title.slice(0, 50)}…" (${analyzedCount}/${candidates.length})`,
      20 + Math.round((analyzedCount / candidates.length) * 65),
      "analyzing"
    );

    try {
      const result = await postJson<{ state: VideoState }>("/api/research/analyze", {
        video,
        topic,
        researchSessionId,
      });
      states.push(result.state);
      onProgress?.(
        `read ${states.length}/${candidates.length} videos`,
        20 + Math.round((analyzedCount / candidates.length) * 65),
        "analyzing",
        { analyzedVideos: states.map((item) => item.video) }
      );
      return result.state;
    } catch {
      const unread: VideoState = {
        state: "unread",
        video: toVideoSummary(video),
        reason: "captions_failed",
      };
      states.push(unread);
      return unread;
    }
  });

  if (states.length === 0 && newStates.length === 0) {
    throw new Error("RESEARCH_FAILED");
  }

  return rankOnly(topic, researchSessionId, queries, states, allCandidates, videosSearched, onProgress);
}

async function rankOnly(
  topic: string,
  researchSessionId: string,
  queries: string[],
  states: VideoState[],
  allCandidates: VideoCandidate[],
  videosSearched: number,
  onProgress?: ProgressCallback
): Promise<RunResearchResult> {
  onProgress?.(`read ${states.length} videos`, 85, "analyzing", {
    analyzedVideos: states.map((item) => item.video),
  });

  onProgress?.("ranking", 90, "ranking");
  const research = await postJson<ResearchResult>("/api/research/rank", {
    topic,
    queriesUsed: queries,
    videosSearched,
    states,
    allCandidates,
    researchSessionId,
  });

  onProgress?.(`found ${research.rankedVideos.length} relevant videos`, 100, "ranking");
  return { research, researchSessionId };
}

export type { BuildKnowledgeBaseResult, SkippedKbVideo } from "@/lib/client/kb-build";
export { pollKnowledgeBaseBuild, buildKnowledgeBaseOnServer } from "@/lib/client/kb-build-poll";

/** Server-driven KB build (indexing runs after POST /api/knowledge-base/build). */
export async function buildKnowledgeBase(
  topic: string,
  rankedVideos: ResearchResult["rankedVideos"],
  onProgress?: ProgressCallback,
  options?: {
    onKnowledgeBaseCreated?: (kbId: string) => void;
    useSpeechToText?: boolean;
    researchId?: string;
  }
): Promise<import("@/lib/client/kb-build").BuildKnowledgeBaseResult> {
  const { buildKnowledgeBaseOnServer } = await import("@/lib/client/kb-build-poll");
  return buildKnowledgeBaseOnServer(topic, rankedVideos, {
    useSpeechToText: options?.useSpeechToText,
    researchId: options?.researchId,
    onKnowledgeBaseCreated: options?.onKnowledgeBaseCreated,
    onProgress: (message, progress) => {
      onProgress?.(message, progress);
    },
  });
}
