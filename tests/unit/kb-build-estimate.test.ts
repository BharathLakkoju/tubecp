import { describe, expect, it } from "vitest";
import {
  estimateKbBuildCompletion,
  formatKbBuildRemaining,
  KB_BUILD_DEFAULT_SECONDS_PER_VIDEO,
} from "@/lib/kb-build-estimate";

describe("estimateKbBuildCompletion", () => {
  it("uses default per-video duration before the first video completes", () => {
    const job = {
      totalVideos: 10,
      processedVideos: 0,
      skippedCount: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const est = estimateKbBuildCompletion(job, "building");
    expect(est.estimatedSecondsRemaining).toBe(10 * KB_BUILD_DEFAULT_SECONDS_PER_VIDEO);
  });

  it("derives ETA from elapsed time after progress", () => {
    const startedAt = new Date(Date.now() - 120_000).toISOString();
    const job = {
      totalVideos: 4,
      processedVideos: 2,
      skippedCount: 0,
      startedAt,
      updatedAt: new Date().toISOString(),
    };

    const est = estimateKbBuildCompletion(job, "building");
    expect(est.estimatedSecondsRemaining).toBeGreaterThanOrEqual(120);
    expect(est.estimatedCompletionAt).toBeTruthy();
  });
});

describe("formatKbBuildRemaining", () => {
  it("formats short and long remaining times", () => {
    expect(formatKbBuildRemaining(45)).toBe("~45s left");
    expect(formatKbBuildRemaining(120)).toBe("~2 min left");
  });
});
