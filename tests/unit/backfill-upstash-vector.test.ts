import { beforeEach, describe, expect, it } from "vitest";
import { saveChunk, saveKnowledgeBase } from "@/lib/store";
import { backfillKnowledgeBaseVectors } from "@/lib/store/backfill-upstash-vector";
import { deleteKbVectors, searchKbVectors } from "@/lib/store/kb-vectors";
import { resetUpstashVectorClientForTests } from "@/lib/store/upstash-vector";
import type { KnowledgeBaseRecord, TranscriptChunk } from "@/lib/types";

describe("backfillKnowledgeBaseVectors", () => {
  const kbId = "kb-backfill";

  beforeEach(async () => {
    resetUpstashVectorClientForTests();
    await deleteKbVectors(kbId);
  });

  it("copies existing chunk embeddings into the Vector namespace", async () => {
    const chunk: TranscriptChunk = {
      id: "vid-1:model:chunker:0",
      videoId: "vid-1",
      title: "Talk",
      channel: "Conf",
      timestamp: 5,
      text: "backfill this embedding",
      embedding: [1, 0, 0, 0],
    };
    const kb: KnowledgeBaseRecord = {
      kbId,
      topic: "backfill",
      userId: "user-1",
      videoIds: ["vid-1"],
      chunkIds: [chunk.id],
      chunksIndexed: 1,
      videosIndexed: 1,
      totalMinutes: 1,
      status: "ready",
      createdAt: new Date().toISOString(),
    };
    await saveKnowledgeBase(kb);
    await saveChunk(chunk);

    const dry = await backfillKnowledgeBaseVectors(kb, { dryRun: true });
    expect(dry.upserted).toBe(1);
    expect(await searchKbVectors(kbId, [1, 0, 0, 0], 1)).toEqual([]);

    const result = await backfillKnowledgeBaseVectors(kb);
    expect(result.upserted).toBe(1);
    expect(result.skipped).toBe(0);
    const hits = await searchKbVectors(kbId, [1, 0, 0, 0], 1);
    expect(hits[0]?.id).toBe(chunk.id);
    expect(hits[0]?.text).toBe(chunk.text);
  });
});
