import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockVideo } from "../fixtures/research";

vi.mock("@/lib/store", () => ({
  getCachedAnalysis: vi.fn(async () => null),
  cacheAnalysis: vi.fn(async () => undefined),
  hashTopic: (value: string) => value,
}));

vi.mock("@/lib/services/semantic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/semantic")>();
  return {
    ...actual,
    getTopicEmbedding: vi.fn(async () => {
      throw new Error("OpenRouter 429");
    }),
  };
});

import { analyzeVideo } from "@/lib/services/relevance";
import { cacheAnalysis } from "@/lib/store";

describe("analyzeVideo metadata fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns metadata-only analysis when embeddings fail", async () => {
    const video = mockVideo({
      title: "AI SaaS monetization strategies",
      searchRank: 2,
    });

    const analysis = await analyzeVideo(video, "AI SaaS monetization");

    expect(analysis.discussesTopic).toBe(true);
    expect(analysis.relevanceScore).toBeGreaterThan(0);
    expect(cacheAnalysis).toHaveBeenCalled();
  });
});
