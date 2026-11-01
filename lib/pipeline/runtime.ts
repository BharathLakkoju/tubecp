import { handleEmbedJob } from "@/lib/pipeline/embed-worker";
import { handleFetchJob } from "@/lib/pipeline/fetch-worker";
import { setInProcessQueueHandler } from "@/lib/pipeline/queue";
import type { PipelineMessage, PipelineStage } from "@/lib/pipeline/messages";
import { RetryLaterError } from "@/lib/pipeline/retry";

let registered = false;

async function runInProcess(stage: PipelineStage, message: PipelineMessage): Promise<void> {
  try {
    if (stage === "fetch") {
      await handleFetchJob(message, 1);
    } else {
      await handleEmbedJob(message, 1);
    }
  } catch (err) {
    if (err instanceof RetryLaterError) {
      setTimeout(() => {
        void runInProcess(stage, message);
      }, err.delaySeconds * 1000);
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
