import type { ScoreSource } from "../types";

export type { ScoreSource };

export type Coverage = "mentioned" | "brief" | "substantial";

/** Title-only scores cannot look like a video whose spoken content was read. */
export const METADATA_FALLBACK_CAP = 45;

/** Ranked results require this understanding score. Search rank does not bypass it. */
export const UNDERSTANDING_RANK_MIN = 38;

export type UnderstandingInput = {
  source: ScoreSource;
  llmScore: number;
  transcriptScore: number;
  metadataScore: number;
  coverage: Coverage;
  evidenceCount: number;
  searchPrior: number;
};

function clamp(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Relevance from what the video says, not where it ranked on YouTube.
 * Search prior is a sort tie-break only. It is not mixed into this number.
 */
export function scoreFromUnderstanding(input: UnderstandingInput): number {
  if (input.source === "metadata_fallback") {
    const raw =
      input.metadataScore * 0.75 + Math.min(Math.max(input.searchPrior, 0), 30) * 0.2;
    return clamp(Math.min(METADATA_FALLBACK_CAP, raw));
  }

  let score = input.llmScore * 0.65 + input.transcriptScore * 0.35;
  if (input.coverage === "substantial" && input.evidenceCount > 0) {
    score += 5;
  }
  if (input.coverage === "mentioned" && input.transcriptScore < 35) {
    score = Math.min(score, 40);
  }
  return clamp(score);
}

/** Legacy blend used before understanding-first scoring. Kept for the proof script. */
export function legacyBlendScore(
  llmScore: number,
  semanticScore: number,
  metadataScore: number,
  discussionLevel: Coverage,
  searchBoost = 0
): number {
  let composite = Math.round(llmScore * 0.3 + semanticScore * 0.35 + metadataScore * 0.35);
  if (discussionLevel === "substantial") composite = Math.min(100, composite + 5);
  if (discussionLevel === "mentioned" && semanticScore < 35) {
    composite = Math.min(composite, 50);
  }
  if (searchBoost > 0) {
    composite = Math.min(100, composite + Math.round(searchBoost * 0.15));
  }
  return Math.min(100, Math.max(0, composite));
}
