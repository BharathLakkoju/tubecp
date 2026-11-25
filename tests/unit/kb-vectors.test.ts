import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  chunkIndexFromId,
  deleteKbVectors,
  searchKbVectors,
  upsertKbChunkVectors,
} from "@/lib/store/kb-vectors";
import { searchKbVectorIndex, deleteKbVectorIndex } from "@/lib/store/vector-index";
import { resetUpstashVectorClientForTests } from "@/lib/store/upstash-vector";
import type { TranscriptChunk } from "@/lib/types";

function embedding(slot: number, dim = 8): number[] {
  return Array.from({ length: dim }, (_, index) => (index === slot ? 1 : 0));
}

function chunk(id: string, slot: number, videoId = "vid-a"): TranscriptChunk {
  return {
    id,
    videoId,
    title: "Talk",
    channel: "Conf",
    timestamp: slot * 10,
    text: `chunk ${id}`,
    embedding: embedding(slot),
  };
}

describe("kb vectors", () => {
  const kbId = "kb-vector-store";
  const originalWrites = process.env.REDIS_VECTOR_INDEX_WRITES;
  const originalBackend = process.env.CHAT_VECTOR_BACKEND;

  beforeEach(async () => {
    delete process.env.REDIS_VECTOR_INDEX_WRITES;
    delete process.env.CHAT_VECTOR_BACKEND;
    resetUpstashVectorClientForTests();
    await deleteKbVectors(kbId);
  });

  afterEach(() => {
    process.env.REDIS_VECTOR_INDEX_WRITES = originalWrites;
    process.env.CHAT_VECTOR_BACKEND = originalBackend;
  });

  it("parses the chunk index from a transcript chunk id", () => {
    expect(chunkIndexFromId("abc:openai/text-embedding-3-small:words-200-overlap-40-v1:4")).toBe(4);
    expect(chunkIndexFromId("uuid-chunk")).toBe(0);
  });

  it("returns the closest match from the Upstash Vector namespace", async () => {
    await upsertKbChunkVectors(kbId, [
      chunk("chunk-a", 0),
      chunk("chunk-b", 1),
    ]);

    const hits = await searchKbVectors(kbId, embedding(0), 1);
    expect(hits[0]?.id).toBe("chunk-a");
    expect(hits[0]?.videoId).toBe("vid-a");
    expect(hits[0]?.text).toBe("chunk chunk-a");
    expect(hits[0]?.startSec).toBe(0);
  });

  it("does not write the Redis IVF index by default", async () => {
    await upsertKbChunkVectors(kbId, [chunk("chunk-a", 0)]);
    expect(await searchKbVectorIndex(kbId, embedding(0), 1)).toEqual([]);
  });

  it("dual-writes Redis IVF when REDIS_VECTOR_INDEX_WRITES is set", async () => {
    process.env.REDIS_VECTOR_INDEX_WRITES = "true";
    await upsertKbChunkVectors(kbId, [chunk("chunk-a", 0)]);
    const hits = await searchKbVectorIndex(kbId, embedding(0), 1);
    expect(hits[0]?.id).toBe("chunk-a");
  });

  it("reads Redis IVF when CHAT_VECTOR_BACKEND=redis", async () => {
    process.env.REDIS_VECTOR_INDEX_WRITES = "true";
    await upsertKbChunkVectors(kbId, [chunk("chunk-a", 0), chunk("chunk-b", 1)]);
    process.env.CHAT_VECTOR_BACKEND = "redis";
    const hits = await searchKbVectors(kbId, embedding(1), 1);
    expect(hits[0]?.id).toBe("chunk-b");
  });

  it("clears both indexes on delete", async () => {
    process.env.REDIS_VECTOR_INDEX_WRITES = "true";
    await upsertKbChunkVectors(kbId, [chunk("chunk-a", 0)]);
    await deleteKbVectors(kbId);
    expect(await searchKbVectors(kbId, embedding(0), 1)).toEqual([]);
    expect(await searchKbVectorIndex(kbId, embedding(0), 1)).toEqual([]);
    await deleteKbVectorIndex(kbId);
  });
});
