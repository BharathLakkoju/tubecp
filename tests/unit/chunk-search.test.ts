import { describe, expect, it } from "vitest";
import { searchChunksByEmbedding } from "@/lib/services/chunk-search";
import { saveChunk } from "@/lib/store";

function embedding(value: number): number[] {
  return Array.from({ length: 16 }, (_, index) => (index === 0 ? value : 0));
}

describe("searchChunksByEmbedding", () => {
  it("searches large chunk sets in batches", async () => {
    const chunkIds: string[] = [];

    for (let i = 0; i < 120; i++) {
      const id = `batch-chunk-${i}`;
      chunkIds.push(id);
      await saveChunk({
        id,
        videoId: "v1",
        title: `Video ${i}`,
        channel: "Channel",
        timestamp: i,
        text: `chunk text ${i}`,
        embedding: embedding(i % 2 === 0 ? 1 : -1),
      });
    }

    const hits = await searchChunksByEmbedding(chunkIds, embedding(1), 5);
    expect(hits).toHaveLength(5);
    expect(hits.every((hit) => hit.score > 0)).toBe(true);
  });
});
