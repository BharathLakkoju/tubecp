import { describe, expect, it } from "vitest";
import { getResearchPipelineLimits, maxSearchFetchCeiling } from "@/lib/research-limits";
import { selectCandidatesForAnalysis } from "@/lib/services/research-scoring";
import { mockVideo } from "../fixtures/research";

describe("getResearchPipelineLimits", () => {
  it("keeps conservative caps on free", () => {
    const limits = getResearchPipelineLimits("free");
    expect(limits.maxResults).toBe(15);
    expect(limits.analyzeLimit).toBe(28);
    expect(limits.analyzeAllWorthy).toBe(false);
  });

  it("uses soft caps on pro", () => {
    const limits = getResearchPipelineLimits("pro");
    expect(limits.maxResults).toBe(40);
    expect(limits.analyzeAllWorthy).toBe(true);
  });

  it("raises ceilings for researcher without going infinite", () => {
    const limits = getResearchPipelineLimits("researcher");
    expect(limits.maxResults).toBe(60);
    expect(limits.analyzeLimit).toBe(65);
    expect(limits.analyzeAllWorthy).toBe(true);
    expect(maxSearchFetchCeiling(limits)).toBeGreaterThanOrEqual(60);
  });

  it("keeps pro search settings unchanged", () => {
    const limits = getResearchPipelineLimits("pro");
    expect(limits.search).toEqual({
      primarySearchResults: 25,
      secondarySearchResults: 10,
      maxSecondaryQueries: 3,
      maxExpandedQueries: 5,
    });
    expect(maxSearchFetchCeiling(limits)).toBe(55);
  });

  it("uses broader search on researcher tier", () => {
    const limits = getResearchPipelineLimits("researcher");
    expect(limits.search.maxSecondaryQueries).toBe(6);
    expect(limits.search.maxExpandedQueries).toBe(8);
    expect(maxSearchFetchCeiling(limits)).toBe(102);
  });
});

describe("selectCandidatesForAnalysis", () => {
  const freeLimits = getResearchPipelineLimits("free");
  const proLimits = getResearchPipelineLimits("pro");

  it("slices free tier to analyze limit regardless of worthiness", () => {
    const candidates = Array.from({ length: 35 }, (_, i) =>
      mockVideo({ videoId: `v${i}`, title: `unrelated video ${i}` })
    );

    const selected = selectCandidatesForAnalysis("profitable apps solo", candidates, freeLimits);
    expect(selected).toHaveLength(28);
  });

  it("analyzes all worthy candidates on pro up to the safety ceiling", () => {
    const candidates = [
      mockVideo({
        videoId: "good1",
        title: "How I Code Profitable Apps SOLO",
        searchRank: 1,
        searchScore: 25,
      }),
      mockVideo({
        videoId: "good2",
        title: "solo developer profitable apps guide",
        searchRank: 3,
        searchScore: 20,
      }),
      mockVideo({ videoId: "bad", title: "Cooking pasta for beginners" }),
    ];

    const selected = selectCandidatesForAnalysis("profitable apps solo", candidates, proLimits);
    expect(selected.map((v) => v.videoId)).toEqual(["good1", "good2"]);
  });
});
