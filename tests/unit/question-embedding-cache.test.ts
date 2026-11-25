import { describe, expect, it, vi } from "vitest";
import { getOrCreateQuestionEmbedding } from "@/lib/store/question-embedding-cache";

describe("question embedding cache", () => {
  it("reuses a cached embedding for 24h instead of calling the provider again", async () => {
    const create = vi.fn(async () => [0.1, 0.2, 0.3]);
    const question = `cache-me-${Date.now()}`;

    const first = await getOrCreateQuestionEmbedding(question, create);
    const second = await getOrCreateQuestionEmbedding(question, create);

    expect(create).toHaveBeenCalledTimes(1);
    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(second.embedding).toEqual([0.1, 0.2, 0.3]);
  });
});
