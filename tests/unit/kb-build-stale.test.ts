import { describe, expect, it } from "vitest";
import {
  isKbBuildStatusStale,
  kbBuildNeedsFinalize,
  kbBuildStatusNeedsFinalize,
} from "@/lib/kb-build-stale";
import type { KnowledgeBaseRecord } from "@/lib/types";

describe("kb-build-stale", () => {
  it("detects when all videos were processed but finalize did not run", () => {
    const record = {
      status: "building",
      buildJob: { totalVideos: 5, processedVideos: 5 },
      rankedVideos: [{ videoId: "a" }],
      chunkIds: ["c1"],
    } as KnowledgeBaseRecord;
    expect(kbBuildNeedsFinalize(record)).toBe(true);
  });

  it("flags stale building status from last update time", () => {
    const stale = new Date(Date.now() - 25 * 60 * 1000).toISOString();
    expect(
      isKbBuildStatusStale({
        kbId: "k",
        topic: "t",
        status: "building",
        progress: 50,
        totalVideos: 10,
        processedVideos: 5,
        skippedCount: 0,
        startedAt: stale,
        updatedAt: stale,
      })
    ).toBe(true);
  });

  it("detects finalize-needed from polled build status", () => {
    expect(
      kbBuildStatusNeedsFinalize({
        kbId: "k",
        topic: "t",
        status: "building",
        progress: 99,
        totalVideos: 3,
        processedVideos: 3,
        skippedCount: 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).toBe(true);
  });
});
