import { describe, expect, it } from "vitest";
import { FairnessLimitError, assertCanStartBuild } from "@/lib/pipeline/limits";
import { getJobStore, resetMemoryJobStore } from "@/lib/pipeline/jobs";
import type { RankedVideo } from "@/lib/types";

const video: RankedVideo = {
  videoId: "a",
  title: "A",
  channel: "Ch",
  url: "https://youtube.com/watch?v=a",
  thumbnailUrl: "",
  relevanceScore: 90,
  whyRelevant: "a",
  discussionLevel: "substantial",
};

describe("pipeline fairness", () => {
  it("rejects a third active build before usage would be charged", async () => {
    process.env.PIPELINE_JOB_STORE = "memory";
    const previousMax = process.env.PIPELINE_USER_MAX_ACTIVE_BUILDS;
    process.env.PIPELINE_USER_MAX_ACTIVE_BUILDS = "2";
    try {
      resetMemoryJobStore();
      const store = getJobStore();
      await store.insertRun({
        kbId: "kb-a",
        userId: "user-1",
        persistent: false,
        transcriptMode: "captions",
        videos: [video],
      });
      await store.insertRun({
        kbId: "kb-b",
        userId: "user-1",
        persistent: false,
        transcriptMode: "captions",
        videos: [video],
      });

      await expect(assertCanStartBuild("user-1")).rejects.toBeInstanceOf(FairnessLimitError);
    } finally {
      if (previousMax === undefined) delete process.env.PIPELINE_USER_MAX_ACTIVE_BUILDS;
      else process.env.PIPELINE_USER_MAX_ACTIVE_BUILDS = previousMax;
    }
  });
});
