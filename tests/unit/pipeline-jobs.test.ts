import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryJobStore } from "@/lib/pipeline/jobs";
import type { RankedVideo } from "@/lib/types";

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

describe("pipeline job store", () => {
  let store = createMemoryJobStore();

  beforeEach(async () => {
    store = createMemoryJobStore();
    await store.insertRun({
      kbId: "kb-1",
      userId: "user-1",
      persistent: false,
      transcriptMode: "captions",
      videos,
    });
  });

  it("upserts one job per video and does not reset indexed rows on a second insert", async () => {
    await store.markIndexed("kb-1", "a", ["chunk-a"], 1);
    await store.insertRun({
      kbId: "kb-1",
      userId: "user-1",
      persistent: false,
      transcriptMode: "captions",
      videos,
    });
    expect(await store.listJobs("kb-1")).toHaveLength(2);
    expect((await store.getJob("kb-1", "a"))?.status).toBe("indexed");
    expect((await store.getJob("kb-1", "b"))?.status).toBe("queued");
    expect(await store.countActiveRuns("user-1")).toBe(1);
  });

  it("makes a duplicate claim a no-op", async () => {
    const first = await store.claimJob("kb-1", "a", ["queued"], "fetching");
    const second = await store.claimJob("kb-1", "a", ["queued"], "fetching");
    expect(first?.status).toBe("fetching");
    expect(second).toBeNull();
  });

  it("releases an in-progress job when the exclusive from-status misses", async () => {
    await store.claimJob("kb-1", "a", ["queued"], "fetching");
    expect(await store.claimJob("kb-1", "a", ["queued"], "fetching")).toBeNull();
    expect((await store.releaseOpenJob("kb-1", "a", "queued"))?.status).toBe("queued");
    expect(await store.releaseOpenJob("kb-1", "a", "queued")).not.toBeNull();
    await store.markIndexed("kb-1", "a", ["c"], 1);
    expect(await store.releaseOpenJob("kb-1", "a", "queued")).toBeNull();
    expect((await store.getJob("kb-1", "a"))?.status).toBe("indexed");
  });

  it("finalizes only when the last job reaches a terminal state", async () => {
    await store.markIndexed("kb-1", "a", ["chunk-a"], 1);
    expect(await store.tryBeginFinalize("kb-1")).toBe(false);

    await store.markSkipped("kb-1", "b", "no_captions", "no captions");
    expect(await store.tryBeginFinalize("kb-1")).toBe(true);
    expect(await store.tryBeginFinalize("kb-1")).toBe(false);

    await store.finishRun("kb-1", "ready");
    const run = await store.getRun("kb-1");
    expect(run?.status).toBe("ready");
    expect((await store.counts("kb-1")).indexed).toBe(1);
  });

  it("only one completeJob call becomes the finalizer when two videos finish", async () => {
    const first = await store.completeJob("kb-1", "a", {
      status: "indexed",
      chunkIds: ["c-a"],
      minutes: 1,
    });
    expect(first.becameFinalizer).toBe(false);
    const second = await store.completeJob("kb-1", "b", {
      status: "skipped",
      errorClass: "no_captions",
      message: "none",
    });
    expect(second.becameFinalizer).toBe(true);
    const third = await store.completeJob("kb-1", "b", {
      status: "skipped",
      errorClass: "no_captions",
      message: "none",
    });
    expect(third.becameFinalizer).toBe(false);
  });
});
