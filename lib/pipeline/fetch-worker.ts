import { getTranscript } from "@/lib/services/transcript";
import {
  classifyPipelineError,
  describePipelineError,
  isTerminalErrorClass,
} from "@/lib/pipeline/errors";
import { getJobStore } from "@/lib/pipeline/jobs";
import {
  assertRetryBudget,
  recordYoutubeBlock,
  takeYoutubeFetchToken,
} from "@/lib/pipeline/limits";
import { pipelineConfig } from "@/lib/pipeline/config";
import { enqueue } from "@/lib/pipeline/queue";
import { retryLater } from "@/lib/pipeline/retry";
import { afterTerminalJob, failJobToDlq, retryOrDeadLetter } from "@/lib/pipeline/worker-support";
import type { PipelineMessage } from "@/lib/pipeline/messages";

export async function handleFetchJob(message: PipelineMessage, receiveCount: number): Promise<void> {
  const store = getJobStore();
  const job = await store.getJob(message.kbId, message.videoId);
  const run = await store.getRun(message.kbId);
  if (!job || !run) return;

  if (job.status === "fetched" || job.status === "embedding" || job.status === "indexed") {
    if (job.status === "fetched") await enqueue("embed", [message]);
    return;
  }
  if (job.status === "skipped" || job.status === "failed") {
    return;
  }

  const claimed = await store.claimJob(message.kbId, message.videoId, ["queued"], "fetching");
  if (!claimed) {
    if (job.status === "fetching") {
      if (receiveCount >= pipelineConfig().maxReceives) {
        await failJobToDlq(message.kbId, message.videoId, run.userId, receiveCount, "stuck fetching");
      }
      throw retryLater(receiveCount, "fetch already in progress");
    }
    return;
  }

  try {
    await assertRetryBudget(receiveCount);
    await takeYoutubeFetchToken();
    await getTranscript(message.videoId, {
      mode: run.transcriptMode,
      usageUserId: run.userId,
    });
    await store.markFetched(message.kbId, message.videoId);
    await enqueue("embed", [message]);
  } catch (err) {
    const errorClass = classifyPipelineError(err);
    if (errorClass === "blocked") {
      await recordYoutubeBlock();
    }
    if (isTerminalErrorClass(errorClass)) {
      const { becameFinalizer } = await store.completeJob(message.kbId, message.videoId, {
        status: "skipped",
        errorClass,
        message: describePipelineError(err),
      });
      await afterTerminalJob(run.userId, message.kbId, becameFinalizer);
      return;
    }
    await retryOrDeadLetter({
      kbId: message.kbId,
      videoId: message.videoId,
      userId: run.userId,
      receiveCount,
      err,
      releaseFrom: "fetching",
      releaseTo: "queued",
    });
  }
}
