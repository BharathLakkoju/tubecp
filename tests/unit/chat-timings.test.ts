import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { streamKnowledgeBaseChat, type ChatTimingLog } from "@/lib/services/chat";
import * as llm from "@/lib/services/llm";
import * as store from "@/lib/store";
import { deleteKbVectors, upsertKbChunkVectors } from "@/lib/store/kb-vectors";
import { resetUpstashVectorClientForTests } from "@/lib/store/upstash-vector";
import type { KnowledgeBaseRecord, TranscriptChunk } from "@/lib/types";

function embedding(slot: number, dim = 8): number[] {
  return Array.from({ length: dim }, (_, index) => (index === slot ? 1 : 0));
}

describe("streamKnowledgeBaseChat timings", () => {
  const kbId = "kb-chat-timings";
  const originalStub = process.env.E2E_STUB_APIS;

  beforeEach(async () => {
    // Keep E2E_AUTH_BYPASS as-is so CI does not try to write KBs to Postgres.
    process.env.E2E_STUB_APIS = "false";
    resetUpstashVectorClientForTests();
    await deleteKbVectors(kbId);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.E2E_STUB_APIS = originalStub;
    vi.restoreAllMocks();
  });

  it("logs embedding ms, search ms, and time to first token, then streams immediately", async () => {
    const chunk: TranscriptChunk = {
      id: "vid-1:model:chunker:0",
      videoId: "vid-1",
      title: "Talk",
      channel: "Conf",
      timestamp: 12,
      text: "Serverless vectors are queried with a single top-k request.",
      embedding: embedding(0),
    };
    const kb: KnowledgeBaseRecord = {
      kbId,
      topic: "vectors",
      userId: "user-1",
      videoIds: ["vid-1"],
      chunkIds: [chunk.id],
      chunksIndexed: 1,
      videosIndexed: 1,
      totalMinutes: 1,
      status: "ready",
      createdAt: new Date().toISOString(),
      rankedVideos: [
        {
          videoId: "vid-1",
          title: "Talk",
          channel: "Conf",
          url: "https://youtube.com/watch?v=vid-1",
          thumbnailUrl: "",
          relevanceScore: 90,
          whyRelevant: "relevant",
          discussionLevel: "substantial",
        },
      ],
    };
    await upsertKbChunkVectors(kbId, [chunk]);
    vi.spyOn(store, "getKnowledgeBase").mockResolvedValue(kb);
    vi.spyOn(llm, "generateEmbedding").mockResolvedValue(embedding(0));
    vi.spyOn(llm, "generateTextStream").mockImplementation(async function* () {
      yield "Answer token";
    });

    const logs: ChatTimingLog[] = [];
    vi.spyOn(console, "info").mockImplementation((message: unknown) => {
      if (typeof message === "string" && message.includes('"event":"chat_timings"')) {
        logs.push(JSON.parse(message) as ChatTimingLog);
      }
    });

    const events: string[] = [];
    let answer = "";
    for await (const event of streamKnowledgeBaseChat(kbId, "How are vectors queried?")) {
      events.push(event.type);
      if (event.type === "token") answer += event.text;
    }

    expect(answer).toBe("Answer token");
    expect(events.indexOf("token")).toBeGreaterThan(-1);
    expect(events.indexOf("token")).toBeLessThan(events.indexOf("done"));
    expect(llm.generateTextStream).toHaveBeenCalledTimes(1);

    expect(logs).toHaveLength(1);
    expect(logs[0]?.kbId).toBe(kbId);
    expect(logs[0]?.backend).toBe("upstash");
    expect(logs[0]?.hitCount).toBe(1);
    expect(logs[0]?.embeddingMs).toBeGreaterThanOrEqual(0);
    expect(logs[0]?.searchMs).toBeGreaterThanOrEqual(0);
    expect(logs[0]?.timeToFirstTokenMs).not.toBeNull();
    expect(logs[0]?.timeToFirstTokenMs ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(2000);
  });
});
