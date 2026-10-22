import { describe, expect, it } from "vitest";
import { buildMetadataOnlyAnalysis } from "@/lib/services/metadata-analysis";
import { mockVideo } from "../fixtures/research";

describe("buildMetadataOnlyAnalysis", () => {
  it("scores highly when title matches the topic", () => {
    const video = mockVideo({
      title: "AI SaaS monetization pricing and MRR growth",
      description: "How to price AI SaaS products and grow revenue.",
      searchRank: 3,
      searchScore: 22,
    });

    const analysis = buildMetadataOnlyAnalysis(video, "AI SaaS monetization");

    expect(analysis.discussesTopic).toBe(true);
    expect(analysis.relevanceScore).toBeGreaterThanOrEqual(45);
    expect(analysis.semanticScore).toBe(0);
    expect(analysis.summary).toContain("keyword match");
  });

  it("uses transcript semantic score when provided", () => {
    const video = mockVideo({ searchRank: 12 });
    const analysis = buildMetadataOnlyAnalysis(video, "AI SaaS monetization", {
      semanticScore: 62,
      metadataScore: 58,
      keywordScore: 55,
    });

    expect(analysis.semanticScore).toBe(62);
    expect(analysis.discussionLevel).toBe("brief");
  });
});
