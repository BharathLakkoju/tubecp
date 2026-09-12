import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { combineScores, metadataText, preRankCandidates } from "@/lib/services/semantic";
import { mockVideo } from "../fixtures/research";
import * as llm from "@/lib/services/llm";

describe("combineScores", () => {
  it("weights LLM, semantic, and metadata scores", () => {
    const score = combineScores(80, 70, 60, "brief");
    expect(score).toBe(Math.round(80 * 0.3 + 70 * 0.35 + 60 * 0.35));
  });

  it("boosts substantial discussion", () => {
    const brief = combineScores(70, 70, 70, "brief");
    const substantial = combineScores(70, 70, 70, "substantial");
    expect(substantial).toBeGreaterThan(brief);
    expect(substantial).toBeLessThanOrEqual(100);
  });

  it("caps mentioned videos with low semantic score", () => {
    const score = combineScores(90, 20, 80, "mentioned");
    expect(score).toBeLessThanOrEqual(50);
  });

  it("clamps to 0-100", () => {
    expect(combineScores(0, 0, 0, "mentioned")).toBe(0);
    expect(combineScores(100, 100, 100, "substantial")).toBe(100);
  });
});

describe("metadataText", () => {
  it("includes title, channel, and description", () => {
    const video = mockVideo({
      title: "AI SaaS Pricing",
      channel: "Founder TV",
      description: "MRR and pricing models",
    });
    const text = metadataText(video);
    expect(text).toContain("AI SaaS Pricing");
    expect(text).toContain("Founder TV");
    expect(text).toContain("MRR");
  });

  it("truncates very long metadata", () => {
    const video = mockVideo({ description: "x".repeat(3000) });
    expect(metadataText(video).length).toBeLessThanOrEqual(2000);
  });
});

describe("preRankCandidates", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to keyword ranking when embeddings fail", async () => {
    vi.spyOn(llm, "generateEmbedding").mockRejectedValue(new Error("502 HTTP 502"));
    vi.spyOn(llm, "generateEmbeddings").mockRejectedValue(new Error("502 HTTP 502"));

    const candidates = [
      mockVideo({ videoId: "a", title: "AI SaaS pricing guide" }),
      mockVideo({ videoId: "b", title: "Cooking pasta" }),
      mockVideo({ videoId: "c", title: "AI SaaS monetization deep dive" }),
    ];

    const ranked = await preRankCandidates("AI SaaS monetization", candidates, 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].videoId).toBe("c");
    expect(ranked[1].videoId).toBe("a");
  });

  it("returns all candidates when under the limit", async () => {
    const candidates = [mockVideo({ videoId: "a" }), mockVideo({ videoId: "b" })];
    const ranked = await preRankCandidates("AI SaaS", candidates, 5);
    expect(ranked).toEqual(candidates);
  });
});
