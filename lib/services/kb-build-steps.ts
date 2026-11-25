import { config } from "@/lib/config";
import { hasMeaningfulEmbeddingContent } from "@/lib/embedding-input";
import {
  classifyPipelineError,
  describePipelineError,
  isTerminalErrorClass,
} from "@/lib/pipeline/errors";
import { getJobStore, TERMINAL_JOB_STATUSES, type JobCompletion } from "@/lib/pipeline/jobs";
import { maybeCommitFinalizer } from "@/lib/pipeline/worker-support";
import {
  CHUNKER_VERSION,
  chunkTranscript,
  isVideoIndexedInKnowledgeBase,
} from "@/lib/services/knowledge-base";
import { generateEmbeddings } from "@/lib/services/llm";
import { writeKbBuildHeartbeat } from "@/lib/services/kb-build-lock";
import {
  getTranscript,
  getTranscriptDurationMinutes,
  TranscriptUnavailableError,
} from "@/lib/services/transcript";
import {
  getCachedTranscript,
  getChunksByIds,
  getChunksForVideos,
  getKnowledgeBase,
  registerVideoChunks,
  saveChunk,
} from "@/lib/store";
import { upsertKbChunkVectors } from "@/lib/store/kb-vectors";
import type {
  KnowledgeBaseRecord,
  RankedVideo,
  Transcript,
  TranscriptChunk,
} from "@/lib/types";

export const KB_BUILD_VIDEO_CONCURRENCY = 5;
export const KB_BUILD_STEP_TIMEOUT = "50s";
export const KB_BUILD_VIDEO_RETRIES = 4;

export type VideoBuildStatus = "indexed" | "skipped" | "failed";

export type VideoBuildResult = {
  videoId: string;
  title: string;
  status: VideoBuildStatus;
  error?: string;
  chunkIds?: string[];
  minutes?: number;
};

export type TranscriptStepResult =
  | { skipped: true; reason: string }
  | { skipped: false; videoId: string; mode: "captions" | "stt"; segmentCount: number };

export type ChunkStepResult =
  | { skipped: true; reason: string }
  | { skipped: false; chunkIds: string[]; minutes: number };

function videoTitle(video: RankedVideo): string {
  return video.title || video.videoId;
}

function skipReason(video: RankedVideo, detail: string): string {
  return `"${videoTitle(video)}" skipped — ${detail}`;
}

export function reusableIndexedChunks(chunks: TranscriptChunk[]): TranscriptChunk[] {
  const model = config.embeddingModel;
  return chunks.filter(
    (chunk) =>
      Boolean(chunk.embedding) && chunk.id.includes(`:${model}:${CHUNKER_VERSION}:`)
  );
}

export async function loadBuildVideo(
  kbId: string,
  videoId: string
): Promise<{ kb: KnowledgeBaseRecord; video: RankedVideo }> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) throw new Error(`Knowledge base not found: ${kbId}`);
  const video = kb.rankedVideos?.find((item) => item.videoId === videoId);
  if (!video) throw new Error(`Video ${videoId} is not part of knowledge base ${kbId}`);
  return { kb, video };
}

export async function reuseIndexedVideoIfPresent(
  kbId: string,
  video: RankedVideo
): Promise<VideoBuildResult | null> {
  const existing = await getChunksForVideos([video.videoId]);
  const reusable = reusableIndexedChunks(existing);
  if (reusable.length === 0 || reusable.length !== existing.length) return null;

  const chunkIds = reusable.map((chunk) => chunk.id);
  return {
    videoId: video.videoId,
    title: videoTitle(video),
    status: "indexed",
    chunkIds,
    minutes: reusable.length * 0.5,
  };
}

export async function fetchVideoTranscriptForBuild(
  kbId: string,
  videoId: string,
  userId?: string
): Promise<TranscriptStepResult> {
  await writeKbBuildHeartbeat(kbId);
  const { kb, video } = await loadBuildVideo(kbId, videoId);
  const mode = kb.buildOptions?.transcriptMode ?? "captions";

  let transcript: Transcript;
  try {
    transcript = await getTranscript(video.videoId, {
      mode,
      usageUserId: userId ?? kb.userId,
    });
  } catch (err) {
    if (err instanceof TranscriptUnavailableError && err.kind === "permanent") {
      return { skipped: true, reason: skipReason(video, `${err.message}.`) };
    }
    if (isTerminalErrorClass(classifyPipelineError(err))) {
      return { skipped: true, reason: skipReason(video, `${describePipelineError(err)}.`) };
    }
    throw err;
  }

  if (transcript.segments.length === 0) {
    return { skipped: true, reason: skipReason(video, "transcript was empty after fetch.") };
  }

  return {
    skipped: false,
    videoId: video.videoId,
    mode,
    segmentCount: transcript.segments.length,
  };
}

export function chunkTranscriptForBuild(
  transcript: Transcript,
  video: RankedVideo
): { skipped: true; reason: string } | { skipped: false; chunks: TranscriptChunk[]; minutes: number } {
  const minutes = getTranscriptDurationMinutes(transcript);
  const chunks = chunkTranscript(transcript.segments, video.videoId, video.title, video.channel);
  if (chunks.length === 0) {
    return { skipped: true, reason: skipReason(video, "transcript was too short to index.") };
  }
  const embeddable = chunks.filter((chunk) => hasMeaningfulEmbeddingContent(chunk.text));
  if (embeddable.length === 0) {
    return { skipped: true, reason: skipReason(video, "transcript had no embeddable text.") };
  }
  return { skipped: false, chunks: embeddable, minutes };
}

export async function persistVideoChunksForBuild(
  kbId: string,
  videoId: string
): Promise<ChunkStepResult> {
  await writeKbBuildHeartbeat(kbId);
  const { kb, video } = await loadBuildVideo(kbId, videoId);
  const mode = kb.buildOptions?.transcriptMode ?? "captions";
  const cacheVariant = mode === "stt" ? "stt" : "captions";
  const transcript =
    (await getCachedTranscript(video.videoId, cacheVariant)) ??
    (await getTranscript(video.videoId, { mode, usageUserId: kb.userId }));

  const chunked = chunkTranscriptForBuild(transcript, video);
  if (chunked.skipped) return chunked;

  const existingById = new Map(
    (await getChunksForVideos([video.videoId])).map((chunk) => [chunk.id, chunk])
  );
  const chunkIds: string[] = [];
  for (const chunk of chunked.chunks) {
    const existing = existingById.get(chunk.id);
    if (existing?.embedding) {
      chunkIds.push(existing.id);
      continue;
    }
    await saveChunk(existing ?? chunk);
    chunkIds.push(chunk.id);
  }
  await registerVideoChunks(video.videoId, chunkIds);

  return { skipped: false, chunkIds, minutes: chunked.minutes };
}

export async function embedPersistedVideoChunks(
  kbId: string,
  videoId: string,
  chunkIds: string[],
  userId?: string
): Promise<{ chunkIds: string[]; embedded: number }> {
  await writeKbBuildHeartbeat(kbId);
  const { kb } = await loadBuildVideo(kbId, videoId);
  const chunks = await getChunksByIds(chunkIds);
  const missing = chunks.filter((chunk) => !chunk.embedding);
  if (missing.length === 0) {
    return { chunkIds, embedded: 0 };
  }

  const embeddings = await generateEmbeddings(
    missing.map((chunk) => chunk.text),
    { usageUserId: userId ?? kb.userId, retries: 0 }
  );

  for (let i = 0; i < missing.length; i++) {
    missing[i].embedding = embeddings[i];
    await saveChunk(missing[i]);
  }

  return { chunkIds, embedded: missing.length };
}

export async function writeVideoIndexForBuild(
  kbId: string,
  videoId: string,
  persistent: boolean,
  chunkIds: string[],
  minutes: number
): Promise<VideoBuildResult> {
  await writeKbBuildHeartbeat(kbId);
  const { video } = await loadBuildVideo(kbId, videoId);
  const chunks = (await getChunksByIds(chunkIds)).filter((chunk) => chunk.embedding);
  if (chunks.length === 0) {
    return {
      videoId: video.videoId,
      title: videoTitle(video),
      status: "skipped",
      error: skipReason(video, "no embedded chunks to index."),
    };
  }

  await registerVideoChunks(video.videoId, chunks.map((chunk) => chunk.id));
  await upsertKbChunkVectors(kbId, chunks);

  const result: VideoBuildResult = {
    videoId: video.videoId,
    title: videoTitle(video),
    status: "indexed",
    chunkIds: chunks.map((chunk) => chunk.id),
    minutes,
  };
  await applyVideoBuildResultToKb(kbId, persistent, result);
  return result;
}

export async function markVideoBuildSkipped(
  kbId: string,
  videoId: string,
  persistent: boolean,
  reason: string
): Promise<VideoBuildResult> {
  const { video } = await loadBuildVideo(kbId, videoId);
  const result: VideoBuildResult = {
    videoId: video.videoId,
    title: videoTitle(video),
    status: "skipped",
    error: reason,
  };
  await applyVideoBuildResultToKb(kbId, persistent, result);
  return result;
}

export function failedVideoBuildResult(
  video: Pick<RankedVideo, "videoId" | "title">,
  err: unknown
): VideoBuildResult {
  return {
    videoId: video.videoId,
    title: videoTitle(video as RankedVideo),
    status: "failed",
    error: `"${videoTitle(video as RankedVideo)}" — ${describePipelineError(err)}`,
  };
}

export function summarizeVideoBuildErrors(results: VideoBuildResult[]): string {
  const problems = results.filter((result) => result.status !== "indexed" && result.error);
  if (problems.length === 0) return "";
  return problems.map((result) => result.error).join(" ");
}

function jobCompletionFromResult(result: VideoBuildResult): JobCompletion {
  if (result.status === "indexed") {
    return {
      status: "indexed",
      chunkIds: result.chunkIds ?? [],
      minutes: result.minutes ?? 0,
    };
  }
  return {
    status: result.status === "skipped" ? "skipped" : "failed",
    errorClass: result.status === "skipped" ? "no_captions" : "unknown",
    message: result.error ?? "Indexing failed",
  };
}

export async function applyVideoBuildResultToKb(
  kbId: string,
  _persistent: boolean,
  result: VideoBuildResult
): Promise<KnowledgeBaseRecord> {
  const store = getJobStore();
  const { becameFinalizer } = await store.completeJob(
    kbId,
    result.videoId,
    jobCompletionFromResult(result)
  );
  await maybeCommitFinalizer(kbId, becameFinalizer);
  await writeKbBuildHeartbeat(kbId);
  const kb = await getKnowledgeBase(kbId);
  if (!kb) throw new Error(`Knowledge base not found: ${kbId}`);
  return kb;
}

export async function completeKnowledgeBaseBuild(
  kbId: string,
  persistent: boolean,
  results: VideoBuildResult[]
): Promise<KnowledgeBaseRecord> {
  const existing = await getKnowledgeBase(kbId);
  if (!existing) throw new Error(`Knowledge base not found: ${kbId}`);
  if (existing.status === "ready" || existing.status === "failed") return existing;

  for (const result of results) {
    await applyVideoBuildResultToKb(kbId, persistent, result);
  }

  const { finalizeQueueBuildIfComplete } = await import("@/lib/pipeline/finalize");
  await finalizeQueueBuildIfComplete(kbId);
  await writeKbBuildHeartbeat(kbId);
  const latest = await getKnowledgeBase(kbId);
  if (!latest) throw new Error(`Knowledge base not found: ${kbId}`);
  return latest;
}

export async function failKnowledgeBaseBuild(
  kbId: string,
  persistent: boolean,
  error: string
): Promise<KnowledgeBaseRecord | null> {
  const current = await getKnowledgeBase(kbId);
  if (!current) return null;
  if (current.status === "ready" || current.status === "failed") return current;

  const store = getJobStore();
  const jobs = await store.listJobs(kbId);
  for (const job of jobs) {
    if (TERMINAL_JOB_STATUSES.includes(job.status)) continue;
    await store.completeJob(kbId, job.videoId, {
      status: "failed",
      errorClass: "unknown",
      message: error,
    });
  }

  return completeKnowledgeBaseBuild(kbId, persistent, []);
}

/** Sequential composition of the durable video steps. Used by unit tests. */
export async function processKbVideoBuild(
  kbId: string,
  videoId: string,
  persistent: boolean
): Promise<VideoBuildResult> {
  const { video } = await loadBuildVideo(kbId, videoId);
  const reused = await reuseIndexedVideoIfPresent(kbId, video);
  if (reused) {
    return writeVideoIndexForBuild(
      kbId,
      videoId,
      persistent,
      reused.chunkIds ?? [],
      reused.minutes ?? 0
    );
  }

  const transcript = await fetchVideoTranscriptForBuild(kbId, videoId);
  if (transcript.skipped) {
    return markVideoBuildSkipped(kbId, videoId, persistent, transcript.reason);
  }

  const chunked = await persistVideoChunksForBuild(kbId, videoId);
  if (chunked.skipped) {
    return markVideoBuildSkipped(kbId, videoId, persistent, chunked.reason);
  }

  await embedPersistedVideoChunks(kbId, videoId, chunked.chunkIds);
  return writeVideoIndexForBuild(kbId, videoId, persistent, chunked.chunkIds, chunked.minutes);
}

export async function loadPendingBuildVideos(kbId: string): Promise<{
  kb: KnowledgeBaseRecord;
  videos: RankedVideo[];
}> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) throw new Error(`Knowledge base not found: ${kbId}`);
  if (kb.status !== "building") return { kb, videos: [] };

  const jobs = await getJobStore().listJobs(kbId);
  if (jobs.length > 0) {
    const open = new Set(
      jobs.filter((job) => !TERMINAL_JOB_STATUSES.includes(job.status)).map((job) => job.videoId)
    );
    return {
      kb,
      videos: (kb.rankedVideos ?? []).filter((video) => open.has(video.videoId)),
    };
  }

  const skipped = new Set(kb.buildJob?.skippedVideoIds ?? []);
  const videos: RankedVideo[] = [];
  for (const video of kb.rankedVideos ?? []) {
    if (skipped.has(video.videoId)) continue;
    if (await isVideoIndexedInKnowledgeBase(kb, video.videoId)) continue;
    videos.push(video);
  }
  return { kb, videos };
}
