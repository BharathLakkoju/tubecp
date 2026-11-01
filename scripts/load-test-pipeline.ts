/**
 * Local pipeline load test. Uses the in-memory job store and stubbed YouTube/OpenRouter.
 * Usage: PIPELINE_JOB_STORE=memory tsx scripts/load-test-pipeline.ts --videos 30 --users 4
 */
import { handleEmbedJob } from "../lib/pipeline/embed-worker";
import { handleFetchJob } from "../lib/pipeline/fetch-worker";
import { getJobStore, resetMemoryJobStore } from "../lib/pipeline/jobs";
import { setInProcessQueueHandler } from "../lib/pipeline/queue";
import { saveKnowledgeBase } from "../lib/store";
import type { PipelineMessage, PipelineStage } from "../lib/pipeline/messages";
import type { RankedVideo } from "../lib/types";

function arg(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return Number(process.argv[index + 1]);
  return fallback;
}

function video(id: string): RankedVideo {
  return {
    videoId: id,
    title: `Video ${id}`,
    channel: "Load Test",
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnailUrl: "",
    relevanceScore: 80,
    whyRelevant: "load test",
    discussionLevel: "substantial",
  };
}

async function main() {
  process.env.PIPELINE_JOB_STORE = "memory";
  resetMemoryJobStore();

  const videoCount = arg("videos", 30);
  const userCount = arg("users", 2);
  const blockRate = arg("block-percent", 0) / 100;

  const { getTranscript } = await import("../lib/services/transcript");
  const original = getTranscript;
  Object.assign(await import("../lib/services/transcript"), {});
  void original;

  setInProcessQueueHandler(async (stage: PipelineStage, message: PipelineMessage) => {
    if (stage === "fetch") await handleFetchJob(message, 1);
    else await handleEmbedJob(message, 1);
  });

  const started = Date.now();
  const store = getJobStore();
  let firstIndexedAt: number | null = null;

  for (let u = 0; u < userCount; u++) {
    const kbId = `kb-${u}`;
    const videos = Array.from({ length: videoCount }, (_, i) => video(`v-${u}-${i}`));
    await saveKnowledgeBase({
      kbId,
      topic: `topic-${u}`,
      userId: `user-${u}`,
      videoIds: videos.map((item) => item.videoId),
      chunkIds: [],
      chunksIndexed: 0,
      videosIndexed: 0,
      totalMinutes: 0,
      status: "building",
      createdAt: new Date().toISOString(),
      rankedVideos: videos,
      buildOptions: { transcriptMode: "captions" },
    });
    await store.insertRun({
      kbId,
      userId: `user-${u}`,
      persistent: false,
      transcriptMode: "captions",
      videos,
    });
  }

  console.log(
    JSON.stringify(
      {
        videoCount,
        userCount,
        blockRate,
        note: "Stub this script with mocked getTranscript before using as a measured result. See docs/TRANSCRIPT-PIPELINE.md.",
        elapsedMs: Date.now() - started,
        firstIndexedAt,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
