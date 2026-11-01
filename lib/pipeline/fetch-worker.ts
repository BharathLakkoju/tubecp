import { getTranscript, TranscriptUnavailableError } from "@/lib/services/transcript";
import {
  classifyPipelineError,
  describePipelineError,
  isTerminalErrorClass,
} from "@/lib/pipeline/errors";
import { getJobStore } from "@/lib/pipeline/jobs";
import {
  recordYoutubeBlock,
  remainingFetchSlots,
  takeYoutubeFetchToken,
  YoutubeCircuitOpenError,
  YoutubeTokenUnavailableError,
} from "@/lib/pipeline/limits";
import { enqueue } from "@/lib/pipeline/queue";
import { retryLater } from "@/lib/pipeline/retry";
import { finalizeQueueBuildIfComplete } from "@/lib/pipeline/finalize";
import type { PipelineMessage } from "@/lib/pipeline/messages";

export async function handleFetchJob(message: PipelineMessage, receiveCount: number): Promise<void> {
  const store = getJobStore();
  const job = await store.getJob(message.kbId, message.videoId);
  const run = await store.getRun(message.kbId);
  if (!job || !run) return;

  if (job.status === "fetched" || job.status === "embedding" || job.status === "indexed") {
    await enqueue("embed", [message]);
    return;
  }
  if (job.status === "skipped" || job.status === "failed") {
    await finalizeQueueBuildIfComplete(message.kbId);
    return;
  }

  try {
    await takeYoutubeFetchToken();
  } catch (err) {
    if (err instanceof YoutubeTokenUnavailableError || err instanceof YoutubeCircuitOpenError) {
      throw retryLater(receiveCount, err.message);
    }
    throw err;
  }

  const claimed = await store.claimJob(message.kbId, message.videoId, ["queued", "fetching"], "fetching");
  if (!claimed) return;

  try {
    await getTranscript(message.videoId, {
      mode: run.transcriptMode,
      usageUserId: run.userId,
    });
    await store.markFetched(message.kbId, message.videoId);
    await enqueue("embed", [message]);
    await releaseQueuedJobs(run.userId);
  } catch (err) {
    const errorClass = classifyPipelineError(err);
    if (errorClass === "blocked") {
      await recordYoutubeBlock();
    }
    if (isTerminalErrorClass(errorClass)) {
      await store.markSkipped(message.kbId, message.videoId, errorClass, describePipelineError(err));
      await finalizeQueueBuildIfComplete(message.kbId);
      await releaseQueuedJobs(run.userId);
      return;
    }
    if (
      err instanceof YoutubeTokenUnavailableError ||
      err instanceof YoutubeCircuitOpenError ||
      err instanceof TranscriptUnavailableError
    ) {
      throw retryLater(receiveCount, describePipelineError(err));
    }
    throw retryLater(receiveCount, describePipelineError(err));
  }
}

async function releaseQueuedJobs(userId: string): Promise<void> {
  const slots = await remainingFetchSlots(userId);
  if (slots <= 0) return;
  const queued = await getJobStore().listQueuedJobs(userId, slots);
  await enqueue(
    "fetch",
    queued.map((job) => ({ kbId: job.kbId, videoId: job.videoId }))
  );
}
