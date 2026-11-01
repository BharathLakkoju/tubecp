import { handleEmbedJob } from "@/lib/pipeline/embed-worker";
import { handleFetchJob } from "@/lib/pipeline/fetch-worker";
import { getJobStore, resetMemoryJobStore } from "@/lib/pipeline/jobs";
import { enqueue, setInProcessQueueHandler } from "@/lib/pipeline/queue";
import { saveKnowledgeBase } from "@/lib/store";
import type { PipelineMessage, PipelineStage } from "@/lib/pipeline/messages";
import type { RankedVideo } from "@/lib/types";

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

export async function runPipelineLoadTest(options: {
  videoCount: number;
  userCount: number;
}): Promise<{
  videoCount: number;
  userCount: number;
  ready: number;
  failed: number;
  firstIndexedMs: number | null;
  elapsedMs: number;
}> {
  process.env.PIPELINE_JOB_STORE = "memory";
  process.env.PIPELINE_LOAD_STUB = "true";
  resetMemoryJobStore();

  const pending: Promise<void>[] = [];
  setInProcessQueueHandler(async (stage: PipelineStage, message: PipelineMessage) => {
    const work =
      stage === "fetch" ? handleFetchJob(message, 1) : handleEmbedJob(message, 1);
    pending.push(work);
    await work;
  });

  const store = getJobStore();
  const started = Date.now();

  for (let u = 0; u < options.userCount; u++) {
    const kbId = `kb-load-${u}`;
    const videos = Array.from({ length: options.videoCount }, (_, i) => video(`v-${u}-${i}`));
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
    await enqueue(
      "fetch",
      videos.map((item) => ({ kbId, videoId: item.videoId }))
    );
  }

  for (let i = 0; i < pending.length; i++) {
    await pending[i];
  }

  let firstIndexedMs: number | null = null;
  let ready = 0;
  let failed = 0;
  for (let u = 0; u < options.userCount; u++) {
    const run = await store.getRun(`kb-load-${u}`);
    if (run?.status === "ready") ready += 1;
    if (run?.status === "failed") failed += 1;
    const jobs = await store.listJobs(`kb-load-${u}`);
    if (jobs.some((job) => job.status === "indexed") && firstIndexedMs === null) {
      firstIndexedMs = Date.now() - started;
    }
  }

  setInProcessQueueHandler(null);

  return {
    videoCount: options.videoCount,
    userCount: options.userCount,
    ready,
    failed,
    firstIndexedMs,
    elapsedMs: Date.now() - started,
  };
}
