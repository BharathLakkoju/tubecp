import { describe, expect, it, vi, beforeEach } from "vitest";
import type { KnowledgeBaseRecord } from "@/lib/types";

const store = vi.hoisted(() => ({
  kb: null as KnowledgeBaseRecord | null,
  pipeline: "legacy" as "legacy" | "queue",
}));

vi.mock("@/lib/store", () => ({
  getKnowledgeBase: vi.fn(async () => store.kb),
  updateKnowledgeBase: vi.fn(async (_kbId: string, updater: (kb: KnowledgeBaseRecord) => KnowledgeBaseRecord) => {
    if (!store.kb) return null;
    store.kb = updater(store.kb);
    return store.kb;
  }),
  saveKnowledgeBase: vi.fn(async (kb: KnowledgeBaseRecord) => {
    store.kb = kb;
  }),
  addUserKnowledgeBase: vi.fn(),
}));

vi.mock("@/lib/services/knowledge-base", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/knowledge-base")>();
  return {
    ...actual,
    finalizeKnowledgeBase: vi.fn(async () => {
      if (!store.kb) throw new Error("missing kb");
      store.kb = { ...store.kb, status: store.kb.chunkIds.length > 0 ? "ready" : "failed" };
      return store.kb;
    }),
    syncKnowledgeBaseIndexStats: vi.fn(async () => store.kb),
  };
});

vi.mock("@/lib/services/kb-chat", () => ({
  ensureKbWelcomeMessage: vi.fn(async () => []),
  refreshKbWelcomeMessage: vi.fn(async () => undefined),
}));

vi.mock("@/lib/inngest/functions", () => ({
  requestKbBuild: vi.fn(async () => undefined),
}));

vi.mock("@/lib/pipeline/orchestrate", () => ({
  kickQueueBuild: vi.fn(async () => undefined),
  retryQueueBuild: vi.fn(async () => undefined),
  startQueueBuild: vi.fn(async () => undefined),
}));

vi.mock("@/lib/pipeline/config", () => ({
  kbPipelineForUser: vi.fn(() => store.pipeline),
}));

import { repairKnowledgeBaseIfIndexed, runKnowledgeBaseBuildJob } from "@/lib/services/kb-build-job";
import { requestKbBuild } from "@/lib/inngest/functions";
import { kickQueueBuild } from "@/lib/pipeline/orchestrate";

describe("kb-build-job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.pipeline = "legacy";
    store.kb = {
      kbId: "kb-1",
      topic: "test",
      userId: "user-1",
      videoIds: ["a", "b"],
      chunkIds: ["a-chunk"],
      chunksIndexed: 1,
      videosIndexed: 1,
      totalMinutes: 10,
      status: "failed",
      createdAt: new Date().toISOString(),
      rankedVideos: [
        { videoId: "a", title: "A", channel: "c", relevanceScore: 1, thumbnailUrl: "", discussionLevel: "substantial" },
        { videoId: "b", title: "B", channel: "c", relevanceScore: 1, thumbnailUrl: "", discussionLevel: "substantial" },
      ],
      buildJob: {
        totalVideos: 2,
        processedVideos: 2,
        skippedCount: 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        error: "welcome failed",
      },
    };
  });

  it("repairs failed KBs that already have indexed chunks", async () => {
    const repaired = await repairKnowledgeBaseIfIndexed("kb-1", false);
    expect(repaired?.status).toBe("ready");
  });

  it("enqueues an Inngest build instead of self-calling the app", async () => {
    store.kb = { ...store.kb!, status: "building" };
    const result = await runKnowledgeBaseBuildJob("kb-1", false);
    expect(requestKbBuild).toHaveBeenCalledWith("kb-1", false);
    expect(kickQueueBuild).not.toHaveBeenCalled();
    expect(result.busy).toBe(true);
  });

  it("does not enqueue when the knowledge base is already terminal", async () => {
    const result = await runKnowledgeBaseBuildJob("kb-1", false);
    expect(requestKbBuild).not.toHaveBeenCalled();
    expect(result.kb.status).toBe("failed");
  });

  it("kicks the queue runner when the user is on the queue transport", async () => {
    store.pipeline = "queue";
    store.kb = { ...store.kb!, status: "building" };
    await runKnowledgeBaseBuildJob("kb-1", false);
    expect(kickQueueBuild).toHaveBeenCalledWith("kb-1");
    expect(requestKbBuild).not.toHaveBeenCalled();
  });
});
