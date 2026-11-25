import { describe, expect, it } from "vitest";
import {
  METADATA_FALLBACK_CAP,
  UNDERSTANDING_RANK_MIN,
  legacyBlendScore,
  scoreFromUnderstanding,
  shouldRankFromUnderstanding,
} from "@/lib/services/video-understanding";

const clickbait = {
  llmScore: 20,
  transcriptScore: 18,
  metadataScore: 92,
  coverage: "mentioned" as const,
  evidenceCount: 0,
  searchPrior: 28,
};

const deepCoverage = {
  llmScore: 82,
  transcriptScore: 78,
  metadataScore: 25,
  coverage: "substantial" as const,
  evidenceCount: 3,
  searchPrior: 4,
};

describe("scoreFromUnderstanding", () => {
  it("does not rank a title-matched video whose transcript does not cover the topic", () => {
    const legacy = legacyBlendScore(
      clickbait.llmScore,
      clickbait.transcriptScore,
      clickbait.metadataScore,
      clickbait.coverage,
      clickbait.searchPrior
    );
    const understanding = scoreFromUnderstanding({
      source: "transcript",
      ...clickbait,
    });

    expect(legacy).toBeGreaterThanOrEqual(UNDERSTANDING_RANK_MIN);
    expect(understanding).toBeLessThan(UNDERSTANDING_RANK_MIN);
  });

  it("ranks spoken coverage above a matching title with an off-topic transcript", () => {
    const deep = scoreFromUnderstanding({
      source: "transcript",
      ...deepCoverage,
    });
    const titleOnlyTranscript = scoreFromUnderstanding({
      source: "transcript",
      ...clickbait,
    });
    expect(deep).toBeGreaterThan(titleOnlyTranscript);
    expect(deep).toBeGreaterThanOrEqual(70);
  });

  it("caps metadata-only scores so missing transcripts cannot look like deep watches", () => {
    const fallback = scoreFromUnderstanding({
      source: "metadata_fallback",
      llmScore: 90,
      transcriptScore: 0,
      metadataScore: 95,
      coverage: "substantial",
      evidenceCount: 0,
      searchPrior: 29,
    });
    expect(fallback).toBeLessThanOrEqual(METADATA_FALLBACK_CAP);
  });

  it("still ranks a 35-37 video that discusses the topic with spoken coverage", () => {
    expect(
      shouldRankFromUnderstanding({
        relevanceScore: 36,
        discussesTopic: true,
        discussionLevel: "brief",
        semanticScore: 50,
        evidence: [{ timestamp: 12, text: "pricing", relevance: 70 }],
        scoreSource: "transcript",
      })
    ).toBe(true);
  });

  it("still ranks a 35-37 video with high semantic coverage even if discussesTopic is false", () => {
    expect(
      shouldRankFromUnderstanding({
        relevanceScore: 36,
        discussesTopic: false,
        discussionLevel: "brief",
        semanticScore: 72,
        evidence: [],
        scoreSource: "transcript",
      })
    ).toBe(true);
  });

  it("does not let a top YouTube hit rank without understanding", () => {
    expect(
      shouldRankFromUnderstanding({
        relevanceScore: 36,
        discussesTopic: false,
        discussionLevel: "mentioned",
        semanticScore: 18,
        evidence: [],
        scoreSource: "transcript",
      })
    ).toBe(false);
  });

  it("does not add YouTube search position into a transcript score", () => {
    const base = {
      source: "transcript" as const,
      llmScore: 70,
      transcriptScore: 70,
      metadataScore: 70,
      coverage: "brief" as const,
      evidenceCount: 1,
    };
    const withoutSearch = scoreFromUnderstanding({ ...base, searchPrior: 0 });
    const withSearch = scoreFromUnderstanding({ ...base, searchPrior: 29 });
    expect(withSearch).toBe(withoutSearch);
  });
});
