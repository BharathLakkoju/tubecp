import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/youtube-query-suggest", () => ({
  fetchYoutubeSearchSuggestions: vi.fn(async () => []),
}));

vi.mock("@/lib/store", () => ({
  getCachedExpandedQueries: vi.fn(async () => null),
  cacheExpandedQueries: vi.fn(async () => undefined),
  hashTopic: (value: string) => value,
}));

vi.mock("@/lib/services/llm", () => ({
  generateText: vi.fn(async () => "[]"),
  generateEmbeddings: vi.fn(async (texts: string[]) => texts.map(() => [1, 0])),
  cosineSimilarity: (a: number[], b: number[]) => {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  },
}));

vi.mock("@/lib/config", () => ({
  config: { openrouterApiKey: "test-key" },
}));

import { expandQueries, fallbackQueries } from "@/lib/services/query-expansion";
import { generateEmbeddings, generateText } from "@/lib/services/llm";
import { fetchYoutubeSearchSuggestions } from "@/lib/services/youtube-query-suggest";
import { cacheExpandedQueries, getCachedExpandedQueries } from "@/lib/store";

describe("expandQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedExpandedQueries).mockResolvedValue(null);
    vi.mocked(generateText).mockResolvedValue("[]");
    vi.mocked(fetchYoutubeSearchSuggestions).mockResolvedValue([]);
  });

  it("returns deduped queries with the topic first", async () => {
    const { queries, cached } = await expandQueries("best budget espresso machine", {
      maxQueries: 5,
    });

    expect(cached).toBe(false);
    expect(queries[0]).toBe("best budget espresso machine");
    expect(queries.length).toBeGreaterThanOrEqual(2);
    expect(queries.some((q) => /for beginners|explained/i.test(q))).toBe(false);
    expect(queries.some((q) => q.includes("solo developer"))).toBe(false);
    expect(cacheExpandedQueries).toHaveBeenCalled();
  });

  it("uses autocomplete suggestions when available", async () => {
    vi.mocked(fetchYoutubeSearchSuggestions).mockResolvedValue([
      "best espresso machine under 500",
      "budget espresso machine review",
    ]);

    const { queries } = await expandQueries("budget espresso machine", { maxQueries: 5 });

    expect(queries).toContain("best espresso machine under 500");
    expect(fetchYoutubeSearchSuggestions).toHaveBeenCalledWith("budget espresso machine");
  });

  it("drops beginner/explained autocomplete on non-learn topics", async () => {
    vi.mocked(fetchYoutubeSearchSuggestions).mockResolvedValue([
      "AI SaaS monetization for beginners",
      "AI SaaS monetization explained",
      "AI SaaS monetization strategy",
    ]);

    const { queries } = await expandQueries("AI SaaS monetization", { maxQueries: 5 });

    expect(queries).toContain("AI SaaS monetization strategy");
    expect(queries.some((q) => /for beginners|explained/i.test(q))).toBe(false);
  });

  it("keeps intent paraphrases and rejects format-only LLM output", async () => {
    vi.mocked(generateText).mockResolvedValue(
      JSON.stringify(["AI SaaS revenue", "AI SaaS pricing", "AI SaaS monetization for beginners"])
    );

    const { queries } = await expandQueries("AI SaaS monetization", { maxQueries: 5 });

    expect(queries).toContain("AI SaaS revenue");
    expect(queries).toContain("AI SaaS pricing");
    expect(queries.some((q) => /for beginners/i.test(q))).toBe(false);
    expect(generateEmbeddings).toHaveBeenCalled();
  });

  it("drops paraphrases that fail the embedding similarity gate", async () => {
    vi.mocked(generateText).mockResolvedValue(
      JSON.stringify(["AI SaaS revenue", "healthcare AI SaaS platforms"])
    );
    vi.mocked(generateEmbeddings).mockResolvedValue([
      [1, 0],
      [0.95, 0.1],
      [0, 1],
    ]);

    const { queries } = await expandQueries("AI SaaS monetization", { maxQueries: 5 });

    expect(queries).toContain("AI SaaS revenue");
    expect(queries).not.toContain("healthcare AI SaaS platforms");
  });

  it("keeps beginner autocomplete on learn topics", async () => {
    vi.mocked(fetchYoutubeSearchSuggestions).mockResolvedValue([
      "react tutorial for beginners",
    ]);

    const { queries } = await expandQueries("react tutorial", { maxQueries: 5 });

    expect(queries).toContain("react tutorial for beginners");
  });

  it("marks repeat expansions as cached for usage limits", async () => {
    vi.mocked(getCachedExpandedQueries)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([
        "how do i ship a saas solo",
        "how to ship a saas solo",
        "ship a saas solo tutorial",
      ]);

    const first = await expandQueries("how do i ship a saas solo", { maxQueries: 5 });
    expect(first.cached).toBe(false);

    const second = await expandQueries("how do i ship a saas solo", { maxQueries: 5 });
    expect(second.cached).toBe(true);
  });
});

describe("fallbackQueries", () => {
  it("uses how-to templates only for learn topics", () => {
    const queries = fallbackQueries("how do i ship a saas solo");
    expect(queries.some((q) => q.startsWith("how to "))).toBe(true);
    expect(queries.some((q) => q.includes("tutorial") || q.includes("walkthrough"))).toBe(true);
    expect(queries.some((q) => /for beginners|explained/i.test(q))).toBe(false);
  });

  it("uses compare templates for product/review topics", () => {
    const queries = fallbackQueries("best budget espresso machine");
    expect(queries.some((q) => q.includes("review"))).toBe(true);
    expect(queries.some((q) => /for beginners|explained|tutorial/i.test(q))).toBe(false);
  });

  it("does not suffix generic conceptual topics", () => {
    expect(fallbackQueries("AI SaaS monetization")).toEqual([]);
  });
});
