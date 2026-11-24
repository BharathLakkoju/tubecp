import { describe, expect, it, vi } from "vitest";
import {
  chunkIdsInBatches,
  KbBuildStepTimeoutError,
  runWithKbBuildStepDeadline,
} from "@/lib/inngest/kb-build-step";
import { KB_BUILD_EMBED_BATCH_SIZE, KB_BUILD_STEP_MS } from "@/lib/services/kb-build-steps";

describe("kb-inngest-step", () => {
  it("splits chunk ids into embed batches", () => {
    const ids = Array.from({ length: KB_BUILD_EMBED_BATCH_SIZE + 5 }, (_, i) => `c-${i}`);
    const batches = chunkIdsInBatches(ids, KB_BUILD_EMBED_BATCH_SIZE);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(KB_BUILD_EMBED_BATCH_SIZE);
    expect(batches[1]).toHaveLength(5);
  });

  it("rejects work that exceeds the KB build step deadline", async () => {
    vi.useFakeTimers();
    const pending = runWithKbBuildStepDeadline(
      () => new Promise<string>((resolve) => setTimeout(() => resolve("done"), KB_BUILD_STEP_MS + 5_000))
    );
    const rejection = expect(pending).rejects.toBeInstanceOf(KbBuildStepTimeoutError);
    await vi.advanceTimersByTimeAsync(KB_BUILD_STEP_MS + 1);
    await rejection;
    vi.useRealTimers();
  });
});