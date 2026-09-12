import { describe, expect, it } from "vitest";
import {
  hybridCandidateScore,
  isStrongYouTubeMatch,
  topicKeywordScore,
} from "@/lib/services/research-scoring";
import { mockVideo } from "../fixtures/research";

describe("topicKeywordScore", () => {
  it("scores title matches for creator-style videos", () => {
    const score = topicKeywordScore(
      "how do i make profitable apps solo",
      "How I Code Profitable Apps SOLO (no wasted time / beginner friendly / with AI)"
    );
    expect(score).toBeGreaterThanOrEqual(60);
  });
});

describe("hybridCandidateScore", () => {
  it("boosts top YouTube search results", () => {
    const top = hybridCandidateScore(
      "profitable apps solo",
      mockVideo({
        title: "How I Code Profitable Apps SOLO",
        searchRank: 1,
        searchScore: 29,
        matchedQueries: 2,
      }),
      0.4
    );
    const low = hybridCandidateScore(
      "profitable apps solo",
      mockVideo({
        title: "Random cooking video",
        searchRank: 20,
        searchScore: 2,
      }),
      0.4
    );

    expect(top).toBeGreaterThan(low);
  });
});

describe("isStrongYouTubeMatch", () => {
  it("detects high-confidence search hits", () => {
    expect(
      isStrongYouTubeMatch(
        mockVideo({ searchRank: 2, searchScore: 25 }),
        50
      )
    ).toBe(true);
  });
});
