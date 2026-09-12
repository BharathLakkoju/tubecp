import { describe, expect, it } from "vitest";
import { getResearchPipelineLimits } from "@/lib/research-limits";
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
    expect(limits.analyzeLimit).toBe(60);
    expect(limits.analyzeAllWorthy).toBe(true);
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
