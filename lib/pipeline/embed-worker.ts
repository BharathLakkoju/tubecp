import { config } from "@/lib/config";
import { hasMeaningfulEmbeddingContent } from "@/lib/embedding-input";
import { generateEmbeddings } from "@/lib/services/llm";
import {
  chunkTranscript,
  CHUNKER_VERSION,
} from "@/lib/services/knowledge-base";
import { getTranscript, getTranscriptDurationMinutes } from "@/lib/services/transcript";
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
import { finalizeQueueBuildIfComplete } from "@/lib/pipeline/finalize";
import { getJobStore } from "@/lib/pipeline/jobs";
import { remainingFetchSlots } from "@/lib/pipeline/limits";
import { enqueue } from "@/lib/pipeline/queue";
import { retryLater } from "@/lib/pipeline/retry";
import type { PipelineMessage } from "@/lib/pipeline/messages";

export async function handleEmbedJob(message: PipelineMessage, receiveCount: number): Promise<void> {
  const store = getJobStore();
  const job = await store.getJob(message.kbId, message.videoId);
  const run = await store.getRun(message.kbId);
  if (!job || !run) return;

  if (job.status === "indexed") {
    await finalizeQueueBuildIfComplete(message.kbId);
    return;
  }
  if (job.status === "skipped" || job.status === "failed") {
    await finalizeQueueBuildIfComplete(message.kbId);
    return;
  }
  if (job.status === "queued" || job.status === "fetching") {
    await enqueue("fetch", [message]);
    return;
  }

  const claimed = await store.claimJob(message.kbId, message.videoId, ["fetched", "embedding"], "embedding");
  if (!claimed) {
    const latest = await store.getJob(message.kbId, message.videoId);
    if (latest?.status === "indexed") {
      await finalizeQueueBuildIfComplete(message.kbId);
    }
    return;
  }

  try {
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
      await store.markIndexed(message.kbId, message.videoId, chunkIds, reusable.length * 0.5);
      await afterIndexed(run.userId, message.kbId);
      return;
    }

    const transcript =
      (await getCachedTranscript(message.videoId, run.transcriptMode === "stt" ? "stt" : "captions")) ??
      (await getTranscript(message.videoId, { mode: run.transcriptMode, usageUserId: run.userId }));

    const chunks = chunkTranscript(transcript.segments, job.videoId, job.title, job.channel);
    const embeddable = chunks.filter((chunk) => hasMeaningfulEmbeddingContent(chunk.text));
    if (embeddable.length === 0) {
      await store.markSkipped(
        message.kbId,
        message.videoId,
        "no_captions",
        `"${job.title}" skipped — transcript was too short to index.`
      );
      await afterIndexed(run.userId, message.kbId);
      return;
    }

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
    await store.markIndexed(
      message.kbId,
      message.videoId,
      chunkIds,
      getTranscriptDurationMinutes(transcript)
    );
    await afterIndexed(run.userId, message.kbId);
  } catch (err) {
    const errorClass = classifyPipelineError(err);
    if (isTerminalErrorClass(errorClass)) {
      await store.markSkipped(message.kbId, message.videoId, errorClass, describePipelineError(err));
      await afterIndexed(run.userId, message.kbId);
      return;
    }
    throw retryLater(receiveCount, describePipelineError(err));
  }
}

async function afterIndexed(userId: string, kbId: string): Promise<void> {
  await finalizeQueueBuildIfComplete(kbId);
  const slots = await remainingFetchSlots(userId);
  if (slots <= 0) return;
  const queued = await getJobStore().listQueuedJobs(userId, slots);
  await enqueue(
    "fetch",
    queued.map((job) => ({ kbId: job.kbId, videoId: job.videoId }))
  );
}
