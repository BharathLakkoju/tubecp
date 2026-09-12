import { describe, expect, it } from "vitest";
import {
  addUserKnowledgeBase,
  getKnowledgeBase,
  getUserKnowledgeBases,
  getChunksByIds,
  saveChunk,
  saveKnowledgeBase,
  registerVideoChunks,
} from "@/lib/store";
import { deleteKnowledgeBase } from "@/lib/services/knowledge-base";
import { saveKbChatMessages, getKbChatMessages } from "@/lib/services/kb-chat";
import type { KnowledgeBaseRecord, TranscriptChunk } from "@/lib/types";

function makeKb(overrides: Partial<KnowledgeBaseRecord> = {}): KnowledgeBaseRecord {
  return {
    kbId: "kb-test-1",
    topic: "Test topic",
    videoIds: ["vid-1"],
    chunkIds: ["chunk-1"],
    chunksIndexed: 1,
    videosIndexed: 1,
    totalMinutes: 5,
    status: "ready",
    createdAt: new Date().toISOString(),
    userId: "user-1",
    ...overrides,
  };
}

function makeChunk(id: string, videoId = "vid-1"): TranscriptChunk {
  return {
    id,
    videoId,
    title: "Video",
    channel: "Channel",
    timestamp: 0,
    text: "hello world",
  };
}

describe("deleteKnowledgeBase", () => {
  it("removes kb record, chunks, user index, and chat messages", async () => {
    const kb = makeKb();
    await saveKnowledgeBase(kb, true);
    await addUserKnowledgeBase("user-1", kb.kbId);
    await saveChunk(makeChunk("chunk-1"));
    await registerVideoChunks("vid-1", ["chunk-1"]);
    await saveKbChatMessages(kb.kbId, [{ role: "user", content: "hi" }]);

    await deleteKnowledgeBase(kb.kbId, "user-1");

    expect(await getKnowledgeBase(kb.kbId)).toBeNull();
    expect(await getUserKnowledgeBases("user-1")).not.toContain(kb.kbId);
    expect(await getChunksByIds(["chunk-1"])).toHaveLength(0);
    expect(await getKbChatMessages(kb.kbId)).toHaveLength(0);
  });

  it("rejects deletion by non-owner", async () => {
    const kb = makeKb();
    await saveKnowledgeBase(kb, true);

    await expect(deleteKnowledgeBase(kb.kbId, "other-user")).rejects.toThrow(
      "You do not have access to this knowledge base"
    );
  });
});
