import { combineScores } from "./semantic";
import { isStrongYouTubeMatch, topicKeywordScore } from "./research-scoring";
import type { VideoCandidate, VideoAnalysis } from "../types";

export type MetadataAnalysisSignals = {
  metadataScore?: number;
  semanticScore?: number;
  keywordScore?: number;
};

function searchRankBoost(video: VideoCandidate): number {
  if (video.searchRank === undefined) return 0;
  if (video.searchRank <= 5) return 12;
  if (video.searchRank <= 10) return 6;
  if (video.searchRank <= 20) return 3;
  return 0;
}

export function scoreMetadataOnly(
  video: VideoCandidate,
  topic: string
): { keywordScore: number; metadataScore: number } {
  const keywordScore = topicKeywordScore(topic, `${video.title} ${video.description ?? ""}`);
  let metadataScore = Math.min(100, keywordScore + searchRankBoost(video));
  if (isStrongYouTubeMatch(video, metadataScore)) {
    metadataScore = Math.min(100, metadataScore + 8);
  }
  return { keywordScore, metadataScore };
}

/** Heuristic relevance when OpenRouter embeddings or the LLM are unavailable. */
export function buildMetadataOnlyAnalysis(
  video: VideoCandidate,
  topic: string,
  signals?: MetadataAnalysisSignals
): VideoAnalysis {
  const scored = scoreMetadataOnly(video, topic);
  const keywordScore = signals?.keywordScore ?? scored.keywordScore;
  const metadataScore = signals?.metadataScore ?? scored.metadataScore;
  const semanticScore = signals?.semanticScore ?? 0;

  const heuristicLlm = Math.min(
    100,
    Math.round(keywordScore * 0.35 + metadataScore * 0.4 + semanticScore * 0.25)
  );

  let discussionLevel: VideoAnalysis["discussionLevel"] = "mentioned";
  if (heuristicLlm >= 72 || semanticScore >= 65) discussionLevel = "substantial";
  else if (heuristicLlm >= 48 || semanticScore >= 45) discussionLevel = "brief";

  const strongSearch = isStrongYouTubeMatch(video, metadataScore);
  const discussesTopic =
    heuristicLlm >= 35 ||
    semanticScore >= 48 ||
    metadataScore >= 55 ||
    keywordScore >= 60 ||
    strongSearch;

  const relevanceScore = combineScores(
    heuristicLlm,
    semanticScore,
    metadataScore,
    discussionLevel,
    video.searchScore ?? 0
  );

  const rankNote =
    video.searchRank !== undefined
      ? ` Ranked #${video.searchRank} on YouTube for this research.`
      : "";

  return {
    videoId: video.videoId,
    relevanceScore,
    llmScore: heuristicLlm,
    semanticScore,
    metadataScore,
    discussesTopic,
    summary: `Likely relevant to "${topic}" from title and description (keyword match ${keywordScore}/100).${rankNote}`,
    discussionLevel,
    evidence: [],
  };
}
