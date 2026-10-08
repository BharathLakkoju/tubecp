import { describe, expect, it, vi, beforeEach } from "vitest";
import type { KnowledgeBaseRecord } from "@/lib/types";

const store = vi.hoisted(() => ({
  kb: null as KnowledgeBaseRecord | null,
}));

vi.mock("@/lib/store", () => ({
  getKnowledgeBase: vi.fn(async () => store.kb),
  updateKnowledgeBase: vi.fn(async (kbId: string, updater: (kb: KnowledgeBaseRecord) => KnowledgeBaseRecord) => {
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
    finalizeKnowledgeBase: vi.fn(async (kbId: string) => {
      if (!store.kb) throw new Error("missing kb");
      store.kb = { ...store.kb, status: store.kb.chunkIds.length > 0 ? "ready" : "failed" };
      return store.kb;
    }),
    indexVideoInKnowledgeBase: vi.fn(),
    syncKnowledgeBaseIndexStats: vi.fn(async (kbId: string) => store.kb),
    isVideoIndexedInKnowledgeBase: vi.fn(async (kb: KnowledgeBaseRecord, videoId: string) =>
      kb.chunkIds.some((id) => id.startsWith(videoId))
    ),
  };
});

vi.mock("@/lib/services/kb-chat", () => ({
  ensureKbWelcomeMessage: vi.fn(async () => []),
  refreshKbWelcomeMessage: vi.fn(async () => undefined),
}));

import { repairKnowledgeBaseIfIndexed, runKnowledgeBaseBuildJob } from "@/lib/services/kb-build-job";
import { indexVideoInKnowledgeBase } from "@/lib/services/knowledge-base";

describe("kb-build-job", () => {
  beforeEach(() => {
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

  it("resumes retry without re-indexing completed videos", async () => {
    vi.mocked(indexVideoInKnowledgeBase).mockResolvedValue({
      kb: store.kb!,
      skipped: false,
    });

    store.kb = { ...store.kb!, status: "building" };
    const result = await runKnowledgeBaseBuildJob("kb-1", false);

    expect(result.kb.status).toBe("ready");
    expect(indexVideoInKnowledgeBase).toHaveBeenCalledTimes(1);
    expect(indexVideoInKnowledgeBase).toHaveBeenCalledWith(
      "kb-1",
      expect.objectContaining({ videoId: "b" }),
      false
    );
  });
});
