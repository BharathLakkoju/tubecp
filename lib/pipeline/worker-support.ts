import { pipelineConfig } from "@/lib/pipeline/config";
import { describePipelineError } from "@/lib/pipeline/errors";
import { commitFinalizer } from "@/lib/pipeline/finalize";
import { getJobStore, type JobStatus } from "@/lib/pipeline/jobs";
import { remainingFetchSlots } from "@/lib/pipeline/limits";
import { enqueue } from "@/lib/pipeline/queue";
import { DeadLetteredError, retryLater } from "@/lib/pipeline/retry";

export async function releaseQueuedJobs(userId: string): Promise<void> {
  const slots = await remainingFetchSlots(userId);
  if (slots <= 0) return;
  const queued = await getJobStore().listQueuedJobs(userId, slots);
  await enqueue(
    "fetch",
    queued.map((job) => ({ kbId: job.kbId, videoId: job.videoId }))
  );
}

export async function afterTerminalJob(userId: string, kbId: string, becameFinalizer: boolean): Promise<void> {
  // Concurrent last jobs can both miss the in-transaction finalize check.
  const shouldFinalize = becameFinalizer || (await getJobStore().tryBeginFinalize(kbId));
  if (shouldFinalize) {
    await commitFinalizer(kbId);
  }
  await releaseQueuedJobs(userId);
}

export async function failJobToDlq(
  kbId: string,
  videoId: string,
  userId: string,
  receiveCount: number,
  err: unknown
): Promise<never> {
  const message = `Dead-lettered after ${receiveCount} attempts: ${describePipelineError(err)}`;
  const { becameFinalizer } = await getJobStore().completeJob(kbId, videoId, {
    status: "failed",
    errorClass: "unknown",
    message,
  });
  await afterTerminalJob(userId, kbId, becameFinalizer);
  throw new DeadLetteredError(message);
}

export async function retryOrDeadLetter(input: {
  kbId: string;
  videoId: string;
  userId: string;
  receiveCount: number;
  err: unknown;
  releaseFrom: JobStatus;
  releaseTo: JobStatus;
}): Promise<never> {
  const { maxReceives } = pipelineConfig();
  if (input.receiveCount >= maxReceives) {
    await failJobToDlq(input.kbId, input.videoId, input.userId, input.receiveCount, input.err);
  }
  const store = getJobStore();
  const released =
    (await store.claimJob(input.kbId, input.videoId, [input.releaseFrom], input.releaseTo)) ??
    (await store.releaseOpenJob(input.kbId, input.videoId, input.releaseTo));
  if (!released) {
    const job = await store.getJob(input.kbId, input.videoId);
    if (job && job.status !== input.releaseTo && job.status !== "indexed" && job.status !== "skipped" && job.status !== "failed") {
      await failJobToDlq(input.kbId, input.videoId, input.userId, input.receiveCount, input.err);
    }
  }
  throw retryLater(input.receiveCount, describePipelineError(input.err));
}
