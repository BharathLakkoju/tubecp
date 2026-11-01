import { describe, expect, it } from "vitest";
import { runPipelineLoadTest } from "@/lib/pipeline/load-test";

describe("pipeline load test", () => {
  it("runs fetch and embed jobs until knowledge bases are ready", async () => {
    const result = await runPipelineLoadTest({ videoCount: 3, userCount: 2 });
    expect(result.ready + result.failed).toBe(2);
    expect(result.ready).toBeGreaterThan(0);
    expect(result.elapsedMs).toBeGreaterThan(0);
  });
});
