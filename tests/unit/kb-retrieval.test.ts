import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retrieveKbChunks, CHAT_RETRIEVAL_TOP_K } from "@/lib/services/kb-retrieval";
import * as llm from "@/lib/services/llm";
import * as chunkSearch from "@/lib/services/chunk-search";
import { saveChunk, saveKnowledgeBase } from "@/lib/store";
import { deleteKbVectors, upsertKbChunkVectors } from "@/lib/store/kb-vectors";
import { addToKbVectorIndex } from "@/lib/store/vector-index";
import { resetUpstashVectorClientForTests } from "@/lib/store/upstash-vector";
import type { KnowledgeBaseRecord, RankedVideo, TranscriptChunk } from "@/lib/types";

function embedding(slot: number, dim = 8): number[] {
  return Array.from({ length: dim }, (_, index) => (index === slot ? 1 : 0));
}

function ranked(videoId: string, title: string): RankedVideo {
  return {
    videoId,
    title,
    channel: "Channel",
    url: `https://youtube.com/watch?v=${videoId}`,
    thumbnailUrl: "",
    relevanceScore: 90,
    whyRelevant: "relevant",
    discussionLevel: "substantial",
  };
}

function makeChunk(
  videoId: string,
  index: number,
  slot: number,
  text: string
): TranscriptChunk {
  return {
    id: `${videoId}:model:chunker:${index}`,
    videoId,
    title: `${videoId} title`,
    channel: "Channel",
    timestamp: index * 30,
    text,
    embedding: embedding(slot),
  };
}

const sampleChunks: TranscriptChunk[] = [
  makeChunk("vid-rsc", 0, 0, "React server components stream HTML to the client as it renders."),
  makeChunk("vid-neon", 0, 1, "Neon connection pooling uses a serverless driver over HTTP."),
  makeChunk("vid-yt", 0, 2, "YouTube caption fetches are rate limited and may return 429."),
  makeChunk("vid-polar", 0, 3, "Polar handles VAT as the merchant of record for subscriptions."),
  makeChunk("vid-inngest", 0, 4, "Inngest runs durable knowledge-base builds as one function per video."),
];

const sampleQuestions: Array<{ question: string; slot: number; videoId: string }> = [
  { question: "How do React server components stream HTML?", slot: 0, videoId: "vid-rsc" },
  { question: "How does Neon pool database connections?", slot: 1, videoId: "vid-neon" },
  { question: "Why do YouTube caption requests get rate limited?", slot: 2, videoId: "vid-yt" },
  { question: "Who handles VAT for Polar subscriptions?", slot: 3, videoId: "vid-polar" },
  { question: "How does Inngest build a knowledge base?", slot: 4, videoId: "vid-inngest" },
];

function kbRecord(kbId: string, chunks: TranscriptChunk[]): KnowledgeBaseRecord {
  return {
    kbId,
    topic: "Sample KB",
    userId: "user-1",
    videoIds: [...new Set(chunks.map((chunk) => chunk.videoId))],
    chunkIds: chunks.map((chunk) => chunk.id),
    chunksIndexed: chunks.length,
    videosIndexed: chunks.length,
    totalMinutes: 10,
    status: "ready",
    createdAt: new Date().toISOString(),
    rankedVideos: chunks.map((chunk) => ranked(chunk.videoId, chunk.title)),
  };
}

describe("retrieveKbChunks", () => {
  const kbId = "kb-retrieval";
  const originalBackend = process.env.CHAT_VECTOR_BACKEND;

  beforeEach(async () => {
    delete process.env.CHAT_VECTOR_BACKEND;
    resetUpstashVectorClientForTests();
    await deleteKbVectors(kbId);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.CHAT_VECTOR_BACKEND = originalBackend;
    vi.restoreAllMocks();
  });

  it("uses top-k=8", () => {
    expect(CHAT_RETRIEVAL_TOP_K).toBe(8);
  });

  it("returns Vector hits without falling back to brute-force chunk scans", async () => {
    const chunks = sampleChunks;
    const kb = kbRecord(kbId, chunks);
    await saveKnowledgeBase(kb);
    for (const item of chunks) await saveChunk(item);
    await upsertKbChunkVectors(kbId, chunks);

    const brute = vi.spyOn(chunkSearch, "searchChunksByEmbedding");
    vi.spyOn(llm, "generateEmbedding").mockResolvedValue(embedding(0));

    const result = await retrieveKbChunks(kb, sampleQuestions[0].question);
    expect(result.backend).toBe("upstash");
    expect(result.hits[0]?.chunk.videoId).toBe("vid-rsc");
    expect(brute).not.toHaveBeenCalled();
    expect(result.embeddingMs).toBeGreaterThanOrEqual(0);
    expect(result.searchMs).toBeGreaterThanOrEqual(0);
  });

  it("does not brute-force scan chunks when the Vector index is empty", async () => {
    const kb = kbRecord(kbId, sampleChunks);
    await saveKnowledgeBase(kb);
    for (const item of sampleChunks) await saveChunk(item);
    const brute = vi.spyOn(chunkSearch, "searchChunksByEmbedding");
    vi.spyOn(llm, "generateEmbedding").mockResolvedValue(embedding(0));

    const result = await retrieveKbChunks(kb, "anything");
    expect(result.hits).toEqual([]);
    expect(brute).not.toHaveBeenCalled();
  });

  it("cites the same sources as Redis IVF for 5 sample questions", async () => {
    const kb = kbRecord(kbId, sampleChunks);
    await saveKnowledgeBase(kb);
    for (const item of sampleChunks) {
      await saveChunk(item);
    }
    await upsertKbChunkVectors(kbId, sampleChunks);
    await addToKbVectorIndex(
      kbId,
      sampleChunks.map((item) => ({ id: item.id, embedding: item.embedding! }))
    );

    for (const sample of sampleQuestions) {
      vi.spyOn(llm, "generateEmbedding").mockResolvedValue(embedding(sample.slot));

      delete process.env.CHAT_VECTOR_BACKEND;
      const fromVector = await retrieveKbChunks(kb, sample.question, 5);

      process.env.CHAT_VECTOR_BACKEND = "redis";
      const fromRedis = await retrieveKbChunks(kb, sample.question, 5);
      delete process.env.CHAT_VECTOR_BACKEND;

      const cited = (hits: typeof fromVector.hits) =>
        hits
          .filter((hit) => hit.score > 0.1)
          .map((hit) => `${hit.chunk.videoId}:${hit.chunk.timestamp}`);
      expect(cited(fromVector.hits)).toEqual(cited(fromRedis.hits));
      expect(fromVector.hits[0]?.chunk.videoId).toBe(sample.videoId);
      expect(fromRedis.hits[0]?.chunk.videoId).toBe(sample.videoId);
    }
  });
});
