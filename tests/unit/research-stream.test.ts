import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/query-expansion", () => ({
  expandQueries: vi.fn(async () => ({ queries: ["q1", "q2"], cached: true })),
}));

vi.mock("@/lib/services/youtube-search", () => ({
  searchYouTubeMultiple: vi.fn(async () => []),
}));

import { runResearchPipeline } from "@/lib/services/research-pipeline";

describe("runResearchPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits expand then search stages and returns an empty result when YouTube finds nothing", async () => {
    const stages: string[] = [];
    const result = await runResearchPipeline("unit topic", {
      planId: "free",
      onProgress: (progress) => {
        stages.push(progress.stage);
      },
    });
    expect(stages[0]).toBe("expanding");
    expect(stages).toContain("searching");
    expect(result.rankedVideos).toEqual([]);
    expect(result.queriesUsed).toEqual(["q1", "q2"]);
  });
});
