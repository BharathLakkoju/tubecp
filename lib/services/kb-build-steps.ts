import { config } from "@/lib/config";
import { hasMeaningfulEmbeddingContent } from "@/lib/embedding-input";
import {
  classifyPipelineError,
  describePipelineError,
  isTerminalErrorClass,
} from "@/lib/pipeline/errors";
import { ensureKbWelcomeMessage, refreshKbWelcomeMessage } from "@/lib/services/kb-chat";
import {
  CHUNKER_VERSION,
  chunkTranscript,
  finalizeKnowledgeBase,
  isVideoIndexedInKnowledgeBase,
} from "@/lib/services/knowledge-base";
import { generateEmbeddings } from "@/lib/services/llm";
import { withKbRecordLock, writeKbBuildHeartbeat } from "@/lib/services/kb-build-lock";
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
  updateKnowledgeBase,
} from "@/lib/store";
import { addToKbVectorIndex } from "@/lib/store/vector-index";
import type {
  KbBuildJobState,
  KnowledgeBaseRecord,
  RankedVideo,
  Transcript,
  TranscriptChunk,
} from "@/lib/types";

export const KB_BUILD_VIDEO_CONCURRENCY = 5;
export const KB_BUILD_STEP_TIMEOUT = "50s";
export const KB_BUILD_VIDEO_RETRIES = 4;

function createInitialBuildJob(totalVideos: number): KbBuildJobState {
  const now = new Date().toISOString();
  return {
    totalVideos,
    processedVideos: 0,
    skippedCount: 0,
    startedAt: now,
    updatedAt: now,
  };
}

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
  await addToKbVectorIndex(
    kbId,
    chunks.map((chunk) => ({ id: chunk.id, embedding: chunk.embedding! }))
  );

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

function videoAlreadyIndexed(current: KnowledgeBaseRecord, videoId: string): boolean {
  return current.chunkIds.some((id) => id === videoId || id.startsWith(`${videoId}:`));
}

function mergeBuildJob(current: KnowledgeBaseRecord, result: VideoBuildResult): KbBuildJobState {
  const base = current.buildJob ?? createInitialBuildJob(current.rankedVideos?.length ?? 0);
  const skippedIds = new Set(base.skippedVideoIds ?? []);
  const alreadySkipped = skippedIds.has(result.videoId);
  const alreadyIndexed = videoAlreadyIndexed(current, result.videoId);
  const alreadyCounted = result.status === "indexed" ? alreadyIndexed : alreadySkipped;
  if (result.status !== "indexed") skippedIds.add(result.videoId);
  return {
    ...base,
    processedVideos: alreadyCounted
      ? base.processedVideos
      : Math.min(base.totalVideos, base.processedVideos + 1),
    skippedCount: skippedIds.size,
    skippedVideoIds: [...skippedIds],
    currentVideoTitle: undefined,
    error: result.status === "indexed" ? undefined : result.error,
    updatedAt: new Date().toISOString(),
  };
}

export async function applyVideoBuildResultToKb(
  kbId: string,
  persistent: boolean,
  result: VideoBuildResult
): Promise<KnowledgeBaseRecord> {
  const updated = await withKbRecordLock(kbId, async () => {
    const kb = await updateKnowledgeBase(
      kbId,
      (current) => {
        if (current.status !== "building") return current;
        const alreadyIndexed = videoAlreadyIndexed(current, result.videoId);
        const chunkIds =
          result.status === "indexed" && result.chunkIds?.length
            ? [...new Set([...current.chunkIds, ...result.chunkIds])]
            : current.chunkIds;
        const videoIds =
          result.status === "skipped"
            ? current.videoIds.filter((id) => id !== result.videoId)
            : current.videoIds.includes(result.videoId)
              ? current.videoIds
              : [...current.videoIds, result.videoId];
        const indexedVideoCount = new Set(
          chunkIds.map((id) => id.split(":")[0]).filter(Boolean)
        ).size;
        return {
          ...current,
          videoIds,
          chunkIds,
          chunksIndexed: chunkIds.length,
          videosIndexed: Math.max(current.videosIndexed, indexedVideoCount),
          totalMinutes:
            result.status === "indexed" && !alreadyIndexed
              ? Math.round(current.totalMinutes + (result.minutes ?? 0))
              : current.totalMinutes,
          buildJob: mergeBuildJob(current, result),
        };
      },
      persistent
    );
    if (!kb) throw new Error(`Failed to update knowledge base ${kbId}`);
    return kb;
  });
  await writeKbBuildHeartbeat(kbId);
  return updated;
}

export async function completeKnowledgeBaseBuild(
  kbId: string,
  persistent: boolean,
  results: VideoBuildResult[]
): Promise<KnowledgeBaseRecord> {
  const existing = await getKnowledgeBase(kbId);
  if (!existing) throw new Error(`Knowledge base not found: ${kbId}`);
  if (existing.status !== "building") return existing;

  for (const result of results) {
    await applyVideoBuildResultToKb(kbId, persistent, result);
  }

  const latest = await withKbRecordLock(kbId, async () => {
    const current = await getKnowledgeBase(kbId);
    if (!current) throw new Error(`Knowledge base not found: ${kbId}`);
    if (current.status !== "building") return current;

    const ready = await finalizeKnowledgeBase(kbId, persistent);
    const failed = ready.status === "failed";
    const summary = summarizeVideoBuildErrors(results);
    const skippedIds = [
      ...new Set([
        ...(ready.buildJob?.skippedVideoIds ?? current.buildJob?.skippedVideoIds ?? []),
        ...results.filter((result) => result.status !== "indexed").map((result) => result.videoId),
      ]),
    ];
    const total = current.rankedVideos?.length ?? results.length;

    const updated = await updateKnowledgeBase(
      kbId,
      (kb) => ({
        ...kb,
        status: failed ? "failed" : "ready",
        buildJob: {
          ...(kb.buildJob ?? createInitialBuildJob(total)),
          totalVideos: total,
          processedVideos: total,
          skippedCount: skippedIds.length,
          skippedVideoIds: skippedIds,
          currentVideoTitle: undefined,
          error: failed
            ? summary ||
              kb.buildJob?.error ||
              "No videos could be indexed. Every selected video was missing a transcript or failed to index."
            : undefined,
          updatedAt: new Date().toISOString(),
        },
      }),
      persistent
    );
    if (!updated) throw new Error(`Failed to finalize knowledge base ${kbId}`);
    return updated;
  });

  if (latest.status === "ready") {
    try {
      await ensureKbWelcomeMessage(kbId);
      await refreshKbWelcomeMessage(kbId);
    } catch (welcomeErr) {
      console.error(`KB welcome message failed for ${kbId}:`, welcomeErr);
    }
  }

  await writeKbBuildHeartbeat(kbId);
  return latest;
}

export async function failKnowledgeBaseBuild(
  kbId: string,
  persistent: boolean,
  error: string
): Promise<KnowledgeBaseRecord | null> {
  const current = await getKnowledgeBase(kbId);
  if (!current) return null;
  if (current.status !== "building") return current;
  if (current.chunkIds.length > 0) {
    return completeKnowledgeBaseBuild(kbId, persistent, []);
  }

  const updated = await withKbRecordLock(kbId, async () => {
    const latest = await getKnowledgeBase(kbId);
    if (!latest) return null;
    if (latest.status !== "building") return latest;
    if (latest.chunkIds.length > 0) return latest;
    return updateKnowledgeBase(
      kbId,
      (kb) => ({
        ...kb,
        status: "failed",
        buildJob: {
          ...(kb.buildJob ?? createInitialBuildJob(kb.rankedVideos?.length ?? 0)),
          currentVideoTitle: undefined,
          error,
          updatedAt: new Date().toISOString(),
        },
      }),
      persistent
    );
  });
  if (updated?.status === "building" && updated.chunkIds.length > 0) {
    return completeKnowledgeBaseBuild(kbId, persistent, []);
  }
  await writeKbBuildHeartbeat(kbId);
  return updated;
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

  const skipped = new Set(kb.buildJob?.skippedVideoIds ?? []);
  const videos: RankedVideo[] = [];
  for (const video of kb.rankedVideos ?? []) {
    if (skipped.has(video.videoId)) continue;
    if (await isVideoIndexedInKnowledgeBase(kb, video.videoId)) continue;
    videos.push(video);
  }
  return { kb, videos };
}
