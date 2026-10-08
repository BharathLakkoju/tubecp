import { describe, expect, it } from "vitest";
import { kbBuildStartIndex } from "@/lib/kb-build-resume";
import type { KnowledgeBaseRecord } from "@/lib/types";

function baseRecord(overrides: Partial<KnowledgeBaseRecord> = {}): KnowledgeBaseRecord {
  return {
    kbId: "kb-1",
    topic: "test",
    userId: "u1",
    videoIds: ["a", "b"],
    chunkIds: [],
    chunksIndexed: 0,
    videosIndexed: 0,
    totalMinutes: 0,
    status: "building",
    createdAt: new Date().toISOString(),
    rankedVideos: [
      { videoId: "a", title: "A", channel: "c", relevanceScore: 1, thumbnailUrl: "", discussionLevel: "substantial" },
      { videoId: "b", title: "B", channel: "c", relevanceScore: 1, thumbnailUrl: "", discussionLevel: "substantial" },
    ],
    buildJob: {
      totalVideos: 2,
      processedVideos: 0,
      skippedCount: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

describe("kbBuildStartIndex", () => {
  it("resumes from processed count while building", () => {
    const record = baseRecord({
      buildJob: {
        ...baseRecord().buildJob!,
        processedVideos: 1,
      },
    });
    expect(kbBuildStartIndex(record)).toBe(1);
  });

  it("re-indexes from start when all videos processed but no chunks exist", () => {
    const record = baseRecord({
      chunkIds: [],
      buildJob: {
        ...baseRecord().buildJob!,
        processedVideos: 2,
        skippedCount: 2,
      },
    });
    expect(kbBuildStartIndex(record)).toBe(0);
  });

  it("skips indexing when processed and chunks exist", () => {
    const record = baseRecord({
      chunkIds: ["chunk-1"],
      buildJob: {
        ...baseRecord().buildJob!,
        processedVideos: 2,
      },
    });
    expect(kbBuildStartIndex(record)).toBe(2);
  });
});
