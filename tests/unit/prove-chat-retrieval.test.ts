import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { streamKnowledgeBaseChat, type ChatTimingLog } from "@/lib/services/chat";
import { retrieveKbChunks, CHAT_RETRIEVAL_TOP_K } from "@/lib/services/kb-retrieval";
import * as llm from "@/lib/services/llm";
import * as chunkSearch from "@/lib/services/chunk-search";
import * as store from "@/lib/store";
import { saveChunk, saveKnowledgeBase } from "@/lib/store";
import { deleteKbVectors, searchKbVectors, upsertKbChunkVectors } from "@/lib/store/kb-vectors";
import * as vectorIndex from "@/lib/store/vector-index";
import { addToKbVectorIndex, searchKbVectorIndex } from "@/lib/store/vector-index";
import { resetUpstashVectorClientForTests } from "@/lib/store/upstash-vector";
import type { KnowledgeBaseRecord, RankedVideo, TranscriptChunk } from "@/lib/types";

const VIDEO_COUNT = 30;
const CHUNKS_PER_VIDEO = 16;
const DIM = 32;

const SAMPLE_QUESTIONS: Array<{ question: string; videoId: string; slot: number }> = [
  { question: "How do React server components stream HTML?", videoId: "vid-01", slot: 0 },
  { question: "How does Neon pool database connections?", videoId: "vid-02", slot: 1 },
  { question: "Why do YouTube caption requests get rate limited?", videoId: "vid-03", slot: 2 },
  { question: "Who handles VAT for Polar subscriptions?", videoId: "vid-04", slot: 3 },
  { question: "How does Inngest build a knowledge base?", videoId: "vid-05", slot: 4 },
];

function oneHot(slot: number): number[] {
  return Array.from({ length: DIM }, (_, index) => (index === slot ? 1 : 0));
}

function fillerEmbedding(videoIndex: number, chunkIndex: number): number[] {
  return Array.from({ length: DIM }, (_, index) => {
    if (index < 5) return 0;
    const seed = (videoIndex * 17 + chunkIndex * 13 + index) % 11;
    return seed === 0 ? 0.05 : 0;
  });
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

function buildCorpus(): { kb: KnowledgeBaseRecord; chunks: TranscriptChunk[] } {
  const chunks: TranscriptChunk[] = [];
  const rankedVideos: RankedVideo[] = [];

  for (let video = 1; video <= VIDEO_COUNT; video++) {
    const videoId = `vid-${String(video).padStart(2, "0")}`;
    rankedVideos.push(ranked(videoId, `Talk ${videoId}`));
    for (let chunkIndex = 0; chunkIndex < CHUNKS_PER_VIDEO; chunkIndex++) {
      const target = SAMPLE_QUESTIONS.find(
        (sample) => sample.videoId === videoId && chunkIndex === 0
      );
      chunks.push({
        id: `${videoId}:model:chunker:${chunkIndex}`,
        videoId,
        title: `Talk ${videoId}`,
        channel: "Channel",
        timestamp: chunkIndex * 30,
        text: target
          ? `${target.question} ${target.videoId} transcript excerpt.`
          : `Filler transcript for ${videoId} chunk ${chunkIndex}.`,
        embedding: target ? oneHot(target.slot) : fillerEmbedding(video, chunkIndex),
      });
    }
  }

  const kb: KnowledgeBaseRecord = {
    kbId: "kb-prove-30",
    topic: "TubeCP retrieval proof",
    userId: "user-1",
    videoIds: rankedVideos.map((video) => video.videoId),
    chunkIds: chunks.map((chunk) => chunk.id),
    chunksIndexed: chunks.length,
    videosIndexed: VIDEO_COUNT,
    totalMinutes: VIDEO_COUNT * 8,
    status: "ready",
    createdAt: new Date().toISOString(),
    rankedVideos,
  };

  return { kb, chunks };
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function cited(hits: Array<{ chunk: { videoId: string; timestamp: number }; score: number }>): string[] {
  return hits
    .filter((hit) => hit.score > 0.1)
    .map((hit) => `${hit.chunk.videoId}:${hit.chunk.timestamp}`);
}

describe("prove chat retrieval on a 30-video KB", () => {
  const originalBackend = process.env.CHAT_VECTOR_BACKEND;
  const originalStub = process.env.E2E_STUB_APIS;
  const { kb, chunks } = buildCorpus();

  beforeEach(async () => {
    delete process.env.CHAT_VECTOR_BACKEND;
    process.env.E2E_STUB_APIS = "false";
    resetUpstashVectorClientForTests();
    await deleteKbVectors(kb.kbId);
    vi.restoreAllMocks();
    await saveKnowledgeBase(kb);
    for (const chunk of chunks) await saveChunk(chunk);
    await upsertKbChunkVectors(kb.kbId, chunks);
    await addToKbVectorIndex(
      kb.kbId,
      chunks.map((chunk) => ({ id: chunk.id, embedding: chunk.embedding! }))
    );
  });

  afterEach(() => {
    process.env.CHAT_VECTOR_BACKEND = originalBackend;
    process.env.E2E_STUB_APIS = originalStub;
    vi.restoreAllMocks();
  });

  it("meets the retrieval ask without regressing Redis IVF citations", async () => {
    expect(chunks).toHaveLength(VIDEO_COUNT * CHUNKS_PER_VIDEO);
    expect(CHAT_RETRIEVAL_TOP_K).toBe(8);

    const brute = vi.spyOn(chunkSearch, "searchChunksByEmbedding");
    const redisSearch = vi.spyOn(vectorIndex, "searchKbVectorIndex");

    const rows: Array<{
      question: string;
      expected: string;
      vector: string[];
      redis: string[];
      hitCount: number;
      searchMs: number;
    }> = [];

    for (const sample of SAMPLE_QUESTIONS) {
      vi.spyOn(llm, "generateEmbedding").mockResolvedValue(oneHot(sample.slot));

      delete process.env.CHAT_VECTOR_BACKEND;
      const fromVector = await retrieveKbChunks(kb, sample.question);

      process.env.CHAT_VECTOR_BACKEND = "redis";
      const fromRedis = await retrieveKbChunks(kb, sample.question);
      delete process.env.CHAT_VECTOR_BACKEND;

      rows.push({
        question: sample.question,
        expected: sample.videoId,
        vector: cited(fromVector.hits),
        redis: cited(fromRedis.hits),
        hitCount: fromVector.hits.length,
        searchMs: fromVector.searchMs,
      });

      expect(fromVector.backend).toBe("upstash");
      expect(fromVector.hits.length).toBeLessThanOrEqual(8);
      expect(fromVector.hits[0]?.chunk.videoId).toBe(sample.videoId);
      expect(cited(fromVector.hits)).toEqual(cited(fromRedis.hits));
    }

    expect(brute).not.toHaveBeenCalled();
    const vectorPathRedisCalls = redisSearch.mock.calls.length;
    expect(vectorPathRedisCalls).toBe(SAMPLE_QUESTIONS.length);

    const searchSamples: number[] = [];
    vi.spyOn(llm, "generateEmbedding").mockResolvedValue(oneHot(0));
    for (let i = 0; i < 11; i++) {
      const result = await retrieveKbChunks(kb, SAMPLE_QUESTIONS[0].question);
      if (i > 0) searchSamples.push(result.embeddingMs + result.searchMs);
    }
    const p50RetrievalMs = percentile(searchSamples, 50);

    console.log("\n=== 30-video KB retrieval proof ===");
    console.log(`videos=${VIDEO_COUNT} chunks=${chunks.length} topK=${CHAT_RETRIEVAL_TOP_K}`);
    console.log("question | expected | vector cites | redis cites | hits | searchMs");
    for (const row of rows) {
      console.log(
        `${row.question} | ${row.expected} | ${row.vector.join(",")} | ${row.redis.join(",")} | ${row.hitCount} | ${row.searchMs}ms`
      );
    }
    console.log(`p50 retrievalMs excluding model (n=${searchSamples.length}): ${p50RetrievalMs}`);
    console.log(`brute-force chunk scans: ${brute.mock.calls.length}`);

    expect(p50RetrievalMs).toBeLessThanOrEqual(2000);
    expect(await searchKbVectors(kb.kbId, oneHot(0), 1)).toHaveLength(1);
    expect(await searchKbVectorIndex(kb.kbId, oneHot(0), 1)).toHaveLength(1);
  });

  it("streams tokens immediately after Vector hits and logs timings", async () => {
    vi.spyOn(store, "getKnowledgeBase").mockResolvedValue(kb);
    vi.spyOn(llm, "generateEmbedding").mockResolvedValue(oneHot(0));
    vi.spyOn(llm, "generateTextStream").mockImplementation(async function* () {
      yield "First token";
    });

    const timings: ChatTimingLog[] = [];
    vi.spyOn(console, "info").mockImplementation((message: unknown) => {
      if (typeof message === "string" && message.includes('"event":"chat_timings"')) {
        timings.push(JSON.parse(message) as ChatTimingLog);
      }
    });

    const events: Array<{ type: string; message?: string }> = [];
    let sources: Array<{ videoId: string; title: string; timestamp: number }> = [];
    for await (const event of streamKnowledgeBaseChat(kb.kbId, SAMPLE_QUESTIONS[0].question)) {
      events.push({
        type: event.type,
        message: event.type === "status" ? event.message : undefined,
      });
      if (event.type === "done") sources = event.sources;
    }

    const statusMessages = events
      .filter((event) => event.type === "status")
      .map((event) => event.message);
    const tokenIndex = events.findIndex((event) => event.type === "token");
    const doneIndex = events.findIndex((event) => event.type === "done");

    console.log("\n=== chat stream proof ===");
    console.log(`events=${events.map((event) => event.type).join(" -> ")}`);
    console.log(`status=${JSON.stringify(statusMessages)}`);
    console.log(`timings=${JSON.stringify(timings[0])}`);
    console.log(`sources=${JSON.stringify(sources.map((source) => source.videoId))}`);

    expect(statusMessages).toEqual(["Exploring your question...", "Finding relevant resources..."]);
    expect(statusMessages).not.toContain("Understanding key points...");
    expect(tokenIndex).toBeGreaterThan(-1);
    expect(tokenIndex).toBeLessThan(doneIndex);
    expect(sources[0]?.videoId).toBe("vid-01");
    expect(timings).toHaveLength(1);
    expect(timings[0]?.backend).toBe("upstash");
    expect(timings[0]?.hitCount).toBeGreaterThan(0);
    expect(timings[0]?.embeddingMs).toBeGreaterThanOrEqual(0);
    expect(timings[0]?.searchMs).toBeGreaterThanOrEqual(0);
    expect(timings[0]?.timeToFirstTokenMs).not.toBeNull();
    expect(timings[0]?.timeToFirstTokenMs ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(2000);
  });
});
