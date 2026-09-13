import { describe, expect, it } from "vitest";
import { loadEvalBenchmark } from "@/lib/eval/benchmark";

describe("loadEvalBenchmark", () => {
  it("returns benchmark snapshot with topics", () => {
    const benchmark = loadEvalBenchmark();
    expect(benchmark).not.toBeNull();
    expect(benchmark!.topicsTotal).toBeGreaterThan(0);
    expect(benchmark!.topics.length).toBe(benchmark!.topicsTotal);
    expect(benchmark!.passRate).toBeGreaterThanOrEqual(0);
  });
});
