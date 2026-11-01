import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RankedVideo } from "@/lib/types";

vi.mock("@/lib/services/kb-chat", () => ({
  ensureKbWelcomeMessage: vi.fn(async () => []),
  refreshKbWelcomeMessage: vi.fn(async () => undefined),
}));

import { ensureKbWelcomeMessage } from "@/lib/services/kb-chat";
import { commitFinalizer, finalizeQueueBuildIfComplete } from "@/lib/pipeline/finalize";
import { getJobStore, resetMemoryJobStore } from "@/lib/pipeline/jobs";
import { getKnowledgeBase, saveKnowledgeBase } from "@/lib/store";

const videos: RankedVideo[] = [
  {
    videoId: "a",
    title: "A",
    channel: "Ch",
    url: "https://youtube.com/watch?v=a",
    thumbnailUrl: "",
    relevanceScore: 90,
    whyRelevant: "a",
    discussionLevel: "substantial",
  },
  {
    videoId: "b",
    title: "B",
    channel: "Ch",
    url: "https://youtube.com/watch?v=b",
    thumbnailUrl: "",
    relevanceScore: 80,
    whyRelevant: "b",
    discussionLevel: "brief",
  },
];

describe("finalize recovery", () => {
  beforeEach(async () => {
    resetMemoryJobStore();
    vi.clearAllMocks();
    await saveKnowledgeBase({
      kbId: "kb-fin",
      topic: "t",
      userId: "user-1",
      videoIds: ["a", "b"],
      chunkIds: [],
      chunksIndexed: 0,
      videosIndexed: 0,
      totalMinutes: 0,
      status: "building",
      createdAt: new Date().toISOString(),
      rankedVideos: videos,
      buildOptions: { transcriptMode: "captions" },
    });
    await getJobStore().insertRun({
      kbId: "kb-fin",
      userId: "user-1",
      persistent: false,
      transcriptMode: "captions",
      videos,
    });
  });

  it("rewrites Redis when the run is stuck in finalizing", async () => {
    await getJobStore().completeJob("kb-fin", "a", {
      status: "indexed",
      chunkIds: ["c-a"],
      minutes: 3,
    });
    await getJobStore().completeJob("kb-fin", "b", {
      status: "skipped",
      errorClass: "no_captions",
      message: "none",
    });

    expect((await getJobStore().getRun("kb-fin"))?.status).toBe("finalizing");
    expect((await getKnowledgeBase("kb-fin"))?.status).toBe("building");

    await expect(finalizeQueueBuildIfComplete("kb-fin")).resolves.toBe(true);
    expect((await getKnowledgeBase("kb-fin"))?.status).toBe("ready");
    expect((await getJobStore().getRun("kb-fin"))?.status).toBe("ready");

    await commitFinalizer("kb-fin");
    expect(vi.mocked(ensureKbWelcomeMessage).mock.calls.length).toBe(1);
  });
});
