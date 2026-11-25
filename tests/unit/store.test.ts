import { describe, expect, it } from "vitest";
import {
  cacheResearchResult,
  deleteChunksForKnowledgeBase,
  getCachedResearchResult,
  getChunkContentsByIds,
  getChunksByIds,
  hashTopic,
  registerVideoChunks,
  researchResultCacheKey,
  saveChunk,
} from "@/lib/store";
import type { ResearchResult } from "@/lib/types";

describe("hashTopic", () => {
  it("returns stable hash for same topic", () => {
    const topic = "React Server Components";
    expect(hashTopic(topic)).toBe(hashTopic(topic));
  });

  it("is case-sensitive", () => {
    expect(hashTopic("Topic")).not.toBe(hashTopic("topic"));
  });

  it("differs for different topics", () => {
    expect(hashTopic("topic a")).not.toBe(hashTopic("topic b"));
  });
});

describe("getChunksByIds", () => {
  it("batch-loads chunks by id", async () => {
    await saveChunk({
      id: "chunk-1",
      videoId: "v1",
      title: "One",
      channel: "Channel",
      timestamp: 0,
      text: "hello",
    });
    await saveChunk({
      id: "chunk-2",
      videoId: "v1",
      title: "One",
      channel: "Channel",
      timestamp: 10,
      text: "world",
    });

    const chunks = await getChunksByIds(["chunk-1", "chunk-2"]);
    expect(chunks).toHaveLength(2);
    expect(chunks.map((chunk) => chunk.id)).toEqual(["chunk-1", "chunk-2"]);
  });
});

describe("getChunkContentsByIds", () => {
  it("loads text-only chunk payloads without embeddings", async () => {
    await saveChunk({
      id: "content-1",
      videoId: "v1",
      title: "One",
      channel: "Channel",
      timestamp: 0,
      text: "hello",
      embedding: [0.1, 0.2],
    });

    const contents = await getChunkContentsByIds(["content-1"]);
    expect(contents).toHaveLength(1);
    expect(contents[0]).toMatchObject({
      id: "content-1",
      text: "hello",
    });
    expect(contents[0]).not.toHaveProperty("embedding");
  });
});

describe("deleteChunksForKnowledgeBase", () => {
  it("removes a large chunk set and empty video lists in batches", async () => {
    const chunkIds = Array.from({ length: 120 }, (_, i) => `bulk-chunk-${i}`);
    await Promise.all(
      chunkIds.map((id, i) =>
        saveChunk({
          id,
          videoId: i < 60 ? "bulk-vid-a" : "bulk-vid-b",
          title: "Bulk",
          channel: "Channel",
          timestamp: i,
          text: `chunk ${i}`,
        })
      )
    );
    await registerVideoChunks(
      "bulk-vid-a",
      chunkIds.filter((_, i) => i < 60)
    );
    await registerVideoChunks(
      "bulk-vid-b",
      chunkIds.filter((_, i) => i >= 60)
    );

    await deleteChunksForKnowledgeBase(["bulk-vid-a", "bulk-vid-b"], chunkIds);

    expect(await getChunksByIds(chunkIds)).toHaveLength(0);
    expect(await getChunksByIds(["bulk-chunk-0", "bulk-chunk-119"])).toHaveLength(0);
  });
});

describe("research result cache", () => {
  it("stores and retrieves completed research", async () => {
    const key = researchResultCacheKey("free", "ai agents");
    const result: ResearchResult = {
      topic: "ai agents",
      queriesUsed: ["ai agents tutorial"],
      videosSearched: 3,
      allVideos: [],
      rankedVideos: [],
    };

    await cacheResearchResult(key, result);
    const cached = await getCachedResearchResult(key);
    expect(cached?.topic).toBe("ai agents");
    expect(cached?.queriesUsed).toEqual(["ai agents tutorial"]);
  });
});
