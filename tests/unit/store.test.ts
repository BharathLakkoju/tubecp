import { describe, expect, it } from "vitest";
import {
  cacheResearchResult,
  getCachedResearchResult,
  getChunkContentsByIds,
  getChunksByIds,
  hashTopic,
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
