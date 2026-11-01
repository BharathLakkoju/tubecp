import { isProduction } from "@/lib/env";
import { pipelineConfig } from "@/lib/pipeline/config";
import { handleEmbedJob } from "@/lib/pipeline/embed-worker";
import { handleFetchJob } from "@/lib/pipeline/fetch-worker";
import { setInProcessQueueHandler } from "@/lib/pipeline/queue";
import type { PipelineMessage, PipelineStage } from "@/lib/pipeline/messages";
import { DeadLetteredError, RetryLaterError } from "@/lib/pipeline/retry";

let registered = false;

async function runInProcess(
  stage: PipelineStage,
  message: PipelineMessage,
  receiveCount = 1
): Promise<void> {
  try {
    if (stage === "fetch") {
      await handleFetchJob(message, receiveCount);
    } else {
      await handleEmbedJob(message, receiveCount);
    }
  } catch (err) {
    if (err instanceof DeadLetteredError) {
      return;
    }
    if (err instanceof RetryLaterError) {
      if (isProduction() || process.env.VERCEL) {
        console.error(
          `Dropped in-process retry for ${stage} ${message.kbId}/${message.videoId}: SQS URLs are required on Vercel`
        );
        return;
      }
      const next = receiveCount + 1;
      if (next > pipelineConfig().maxReceives) {
        return;
      }
      await runInProcess(stage, message, next);
      return;
    }
    throw err;
  }
}

export function ensureInProcessPipeline(): void {
  if (registered) return;
  registered = true;
  setInProcessQueueHandler(runInProcess);
}

export async function dispatchPipelineMessage(
  stage: PipelineStage,
  message: PipelineMessage,
  receiveCount: number
): Promise<void> {
  if (stage === "fetch") {
    await handleFetchJob(message, receiveCount);
    return;
  }
  await handleEmbedJob(message, receiveCount);
}
