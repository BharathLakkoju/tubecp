import { describe, expect, it } from "vitest";
import { rankVideos } from "@/lib/services/relevance";
import { mockAnalysisPair, mockVideo } from "../fixtures/research";

describe("rankVideos", () => {
  const topic = "AI SaaS monetization";
  const queries = ["AI SaaS revenue", "AI SaaS pricing"];

  it("filters low-scoring videos", () => {
    const analyses = [
      mockAnalysisPair({}, { relevanceScore: 80, discussionLevel: "substantial" }),
      mockAnalysisPair({ videoId: "low" }, { relevanceScore: 30, discussesTopic: false }),
    ];

    const result = rankVideos(topic, queries, 10, analyses);
    expect(result.rankedVideos).toHaveLength(1);
    expect(result.rankedVideos[0].videoId).toBe("vid123");
  });

  it("sorts by relevance score descending", () => {
    const analyses = [
      mockAnalysisPair({ videoId: "a", title: "A" }, { relevanceScore: 60 }),
      mockAnalysisPair({ videoId: "b", title: "B" }, { relevanceScore: 90 }),
      mockAnalysisPair({ videoId: "c", title: "C" }, { relevanceScore: 75 }),
    ];

    const result = rankVideos(topic, queries, 10, analyses);
    expect(result.rankedVideos.map((v) => v.videoId)).toEqual(["b", "c", "a"]);
  });

  it("respects maxVideos cap", () => {
    const analyses = Array.from({ length: 10 }, (_, i) =>
      mockAnalysisPair(
        { videoId: `v${i}` },
        { relevanceScore: 50 + i, discussionLevel: "brief" }
      )
    );

    const result = rankVideos(topic, queries, 20, analyses, 3);
    expect(result.rankedVideos).toHaveLength(3);
  });

  it("includes videos with high semantic score even if discussesTopic is false", () => {
    const analyses = [
      mockAnalysisPair(
        { videoId: "semantic" },
        {
          relevanceScore: 55,
          discussesTopic: false,
          semanticScore: 72,
          discussionLevel: "brief",
        }
      ),
    ];

    const result = rankVideos(topic, queries, 5, analyses);
    expect(result.rankedVideos).toHaveLength(1);
  });

  it("returns topic and query metadata", () => {
    const result = rankVideos(topic, queries, 42, []);
    expect(result.topic).toBe(topic);
    expect(result.queriesUsed).toEqual(queries);
    expect(result.videosSearched).toBe(42);
    expect(result.allVideos).toEqual([]);
  });

  it("includes all scraped candidates in allVideos", () => {
    const scraped = [
      mockVideo({ videoId: "a", title: "A" }),
      mockVideo({ videoId: "b", title: "B" }),
    ];
    const analyses = [mockAnalysisPair({ videoId: "a" }, { relevanceScore: 80 })];

    const result = rankVideos(topic, queries, 2, analyses, 5, scraped);
    expect(result.allVideos).toHaveLength(2);
    expect(result.allVideos[0].thumbnailUrl).toContain("a");
    expect(result.rankedVideos[0].thumbnailUrl).toContain("a");
  });

  it("maps substantial semantic matches to substantial discussion level", () => {
    const analyses = [
      mockAnalysisPair(
        {},
        { discussionLevel: "brief", semanticScore: 70, relevanceScore: 70 }
      ),
    ];
    const result = rankVideos(topic, queries, 1, analyses);
    expect(result.rankedVideos[0].discussionLevel).toBe("substantial");
  });
});
