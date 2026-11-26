import { describe, expect, it } from "vitest";
import { buildMetadataOnlyAnalysis } from "@/lib/services/metadata-analysis";
import { rankVideos } from "@/lib/services/relevance";
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
    expect(analysis.scoreSource).toBe("metadata_fallback");
    expect(analysis.relevanceScore).toBeGreaterThan(0);
    expect(analysis.relevanceScore).toBeLessThanOrEqual(45);
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

  it("ranks a low-placed video that names the subject of a long topic", () => {
    const topic = "lauren tan workflows and agentic development practices";
    const aboutHer = mockVideo({
      videoId: "lauren",
      title: "Grok Bot Q&A with Lauren Tan",
      description: "",
      searchRank: 40,
      searchScore: 0,
    });
    const generic = mockVideo({
      videoId: "generic",
      title: "4 AI Agents To Automate 99% Of Your Life",
      description: "",
      searchRank: 30,
      searchScore: 4,
    });
    const substring = mockVideo({
      videoId: "stanford",
      title: "What Are AI Agents? Agentic Systems Explained | Stanford CS329Z",
      description: "",
      searchRank: 12,
      searchScore: 6,
    });

    const analyses = [aboutHer, generic, substring].map((video) => ({
      video,
      analysis: buildMetadataOnlyAnalysis(video, topic),
    }));
    const ranked = rankVideos(topic, [topic], 59, analyses, 60, [aboutHer, generic, substring]);

    expect(ranked.rankedVideos.map((video) => video.videoId)).toEqual(["lauren"]);
  });
});
