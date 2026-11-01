import { config } from "@/lib/config";
import { hasMeaningfulEmbeddingContent } from "@/lib/embedding-input";
import { generateEmbeddings } from "@/lib/services/llm";
import { chunkTranscript, CHUNKER_VERSION } from "@/lib/services/knowledge-base";
import { getTranscriptDurationMinutes } from "@/lib/services/transcript";
import {
  getCachedTranscript,
  getChunksForVideos,
  registerVideoChunks,
  saveChunk,
} from "@/lib/store";
import { addToKbVectorIndex } from "@/lib/store/vector-index";
import {
  classifyPipelineError,
  describePipelineError,
  isTerminalErrorClass,
} from "@/lib/pipeline/errors";
import { getJobStore } from "@/lib/pipeline/jobs";
import {
  assertRetryBudget,
  takeEmbedBudget,
} from "@/lib/pipeline/limits";
import { pipelineConfig } from "@/lib/pipeline/config";
import { enqueue } from "@/lib/pipeline/queue";
import { retryLater } from "@/lib/pipeline/retry";
import { afterTerminalJob, failJobToDlq, retryOrDeadLetter } from "@/lib/pipeline/worker-support";
import type { PipelineMessage } from "@/lib/pipeline/messages";

export async function handleEmbedJob(message: PipelineMessage, receiveCount: number): Promise<void> {
  const store = getJobStore();
  const job = await store.getJob(message.kbId, message.videoId);
  const run = await store.getRun(message.kbId);
  if (!job || !run) return;

  if (job.status === "indexed" || job.status === "skipped" || job.status === "failed") {
    return;
  }
  if (job.status === "queued" || job.status === "fetching") {
    await enqueue("fetch", [message]);
    return;
  }

  const claimed = await store.claimJob(message.kbId, message.videoId, ["fetched"], "embedding");
  if (!claimed) {
    if (job.status === "embedding") {
      if (receiveCount >= pipelineConfig().maxReceives) {
        await failJobToDlq(message.kbId, message.videoId, run.userId, receiveCount, "stuck embedding");
      }
      throw retryLater(receiveCount, "embed already in progress");
    }
    return;
  }

  try {
    await assertRetryBudget(receiveCount);
    const existing = await getChunksForVideos([message.videoId]);
    const reusable = existing.filter(
      (chunk) =>
        Boolean(chunk.embedding) &&
        chunk.id.includes(`:${config.embeddingModel}:${CHUNKER_VERSION}:`)
    );
    if (reusable.length > 0 && reusable.length === existing.length) {
      const chunkIds = reusable.map((chunk) => chunk.id);
      await registerVideoChunks(message.videoId, chunkIds);
      await addToKbVectorIndex(
        message.kbId,
        reusable.map((chunk) => ({ id: chunk.id, embedding: chunk.embedding! }))
      );
      const cached = await getCachedTranscript(
        message.videoId,
        run.transcriptMode === "stt" ? "stt" : "captions"
      );
      const { becameFinalizer } = await store.completeJob(message.kbId, message.videoId, {
        status: "indexed",
        chunkIds,
        minutes: cached ? getTranscriptDurationMinutes(cached) : reusable.length * 0.5,
      });
      await afterTerminalJob(run.userId, message.kbId, becameFinalizer);
      return;
    }

    const transcript = await getCachedTranscript(
      message.videoId,
      run.transcriptMode === "stt" ? "stt" : "captions"
    );
    if (!transcript) {
      await store.claimJob(message.kbId, message.videoId, ["embedding"], "queued");
      await enqueue("fetch", [message]);
      return;
    }

    const chunks = chunkTranscript(transcript.segments, job.videoId, job.title, job.channel);
    const embeddable = chunks.filter((chunk) => hasMeaningfulEmbeddingContent(chunk.text));
    if (embeddable.length === 0) {
      const { becameFinalizer } = await store.completeJob(message.kbId, message.videoId, {
        status: "skipped",
        errorClass: "no_captions",
        message: `"${job.title}" skipped — transcript was too short to index.`,
      });
      await afterTerminalJob(run.userId, message.kbId, becameFinalizer);
      return;
    }

    const tokenEstimate = embeddable.reduce((sum, chunk) => sum + Math.ceil(chunk.text.length / 4), 0);
    await takeEmbedBudget(tokenEstimate);

    const embeddings = await generateEmbeddings(
      embeddable.map((chunk) => chunk.text),
      { usageUserId: run.userId }
    );
    const chunkIds: string[] = [];
    for (let i = 0; i < embeddable.length; i++) {
      embeddable[i].embedding = embeddings[i];
      await saveChunk(embeddable[i]);
      chunkIds.push(embeddable[i].id);
    }
    await addToKbVectorIndex(
      message.kbId,
      embeddable.map((chunk) => ({ id: chunk.id, embedding: chunk.embedding! }))
    );
    await registerVideoChunks(message.videoId, chunkIds);
    const { becameFinalizer } = await store.completeJob(message.kbId, message.videoId, {
      status: "indexed",
      chunkIds,
      minutes: getTranscriptDurationMinutes(transcript),
    });
    await afterTerminalJob(run.userId, message.kbId, becameFinalizer);
  } catch (err) {
    const errorClass = classifyPipelineError(err);
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
      releaseFrom: "embedding",
      releaseTo: "fetched",
    });
  }
}
