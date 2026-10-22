import { isE2eStubMode, stubKnowledgeBaseBuild } from "@/lib/e2e-stub";
import {
  createKnowledgeBase,
  finalizeKnowledgeBase,
  indexVideoInKnowledgeBase,
  isVideoIndexedInKnowledgeBase,
  syncKnowledgeBaseIndexStats,
} from "@/lib/services/knowledge-base";
import { ensureKbWelcomeMessage, refreshKbWelcomeMessage } from "@/lib/services/kb-chat";
import { addUserKnowledgeBase, getKnowledgeBase, updateKnowledgeBase } from "@/lib/store";
import { knowledgeBaseBuildStatusFromRecord } from "@/lib/kb-build-status";
import { kbIndexPaceDelayMs } from "@/lib/kb-index-pace";
import { scheduleKbBuildContinuation } from "@/lib/services/kb-build-continue";
import {
  acquireKbBuildLock,
  clearKbBuildHeartbeat,
  refreshKbBuildLock,
  releaseKbBuildLock,
  writeKbBuildHeartbeat,
} from "@/lib/services/kb-build-lock";
import type { KbBuildJobState, KbBuildOptions, KnowledgeBaseRecord, RankedVideo } from "@/lib/types";
import { isRetryableLlmError } from "@/lib/services/llm";
import { TranscriptUnavailableError } from "@/lib/services/transcript";
import type { BuildKnowledgeBaseResult } from "./kb-build";

const MAX_VIDEO_ATTEMPTS = 2;
const MAX_TRANSIENT_VIDEO_ATTEMPTS = 6;
const HEARTBEAT_MS = 20_000;
/** Stay under Vercel's 300s limit while chaining multiple videos in one invocation. */
const INVOKE_CHAIN_BUDGET_MS = 240_000;

function maxAttemptsForError(err: unknown): number {
  if (err instanceof TranscriptUnavailableError && err.kind === "transient") {
    return MAX_TRANSIENT_VIDEO_ATTEMPTS;
  }
  if (isRetryableLlmError(err)) {
    return MAX_TRANSIENT_VIDEO_ATTEMPTS;
  }
  return MAX_VIDEO_ATTEMPTS;
}

function transientBackoffMs(attempt: number): number {
  return Math.min(30_000, 2_000 * 2 ** attempt);
}

export function createInitialBuildJob(totalVideos: number): KbBuildJobState {
  const now = new Date().toISOString();
  return {
    totalVideos,
    processedVideos: 0,
    skippedCount: 0,
    startedAt: now,
    updatedAt: now,
  };
}

async function updateBuildJob(
  kbId: string,
  persistent: boolean,
  patch: Partial<KbBuildJobState>
): Promise<void> {
  await updateKnowledgeBase(
    kbId,
    (current) => {
      const base: KbBuildJobState =
        current.buildJob ?? createInitialBuildJob(current.rankedVideos?.length ?? 0);
      const buildJob: KbBuildJobState = {
        totalVideos: patch.totalVideos ?? base.totalVideos,
        processedVideos: patch.processedVideos ?? base.processedVideos,
        skippedCount: patch.skippedCount ?? base.skippedCount,
        startedAt: patch.startedAt ?? base.startedAt,
        currentVideoTitle:
          "currentVideoTitle" in patch ? patch.currentVideoTitle : base.currentVideoTitle,
        error: "error" in patch ? patch.error : base.error,
        skippedVideoIds:
          "skippedVideoIds" in patch ? patch.skippedVideoIds : base.skippedVideoIds,
        attemptCounts: "attemptCounts" in patch ? patch.attemptCounts : base.attemptCounts,
        updatedAt: new Date().toISOString(),
      };
      return { ...current, buildJob };
    },
    persistent
  );
}

async function completeReadyKnowledgeBase(
  kbId: string,
  persistent: boolean
): Promise<void> {
  try {
    await ensureKbWelcomeMessage(kbId);
    await refreshKbWelcomeMessage(kbId);
  } catch (welcomeErr) {
    console.error(`KB welcome message failed for ${kbId}:`, welcomeErr);
  }
}

export async function repairKnowledgeBaseIfIndexed(
  kbId: string,
  persistent: boolean
): Promise<KnowledgeBaseRecord | null> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb || kb.status !== "failed" || kb.chunkIds.length === 0) {
    return kb;
  }

  await syncKnowledgeBaseIndexStats(kbId, persistent);
  const ready = await finalizeKnowledgeBase(kbId, persistent);
  await completeReadyKnowledgeBase(kbId, persistent);
  return ready;
}

export async function startKnowledgeBaseBuild(
  topic: string,
  rankedVideos: RankedVideo[],
  userId: string,
  persistent: boolean,
  buildOptions?: KbBuildOptions
): Promise<KnowledgeBaseRecord> {
  if (isE2eStubMode()) {
    const { kb } = await stubKnowledgeBaseBuild(topic, rankedVideos, userId, persistent);
    return kb;
  }

  const kb = await createKnowledgeBase(topic, rankedVideos, userId, persistent, buildOptions);
  kb.buildJob = createInitialBuildJob(rankedVideos.length);
  await updateKnowledgeBase(kb.kbId, () => kb, persistent);
  await addUserKnowledgeBase(userId, kb.kbId);
  return kb;
}

export type KbBuildJobResult = BuildKnowledgeBaseResult & { busy?: boolean };

async function pendingBuildVideos(kb: KnowledgeBaseRecord): Promise<RankedVideo[]> {
  const skipped = new Set(kb.buildJob?.skippedVideoIds ?? []);
  const pending: RankedVideo[] = [];

  for (const video of kb.rankedVideos ?? []) {
    if (skipped.has(video.videoId)) continue;
    const current = await getKnowledgeBase(kb.kbId);
    if (current && (await isVideoIndexedInKnowledgeBase(current, video.videoId))) continue;
    pending.push(video);
  }

  return pending;
}

async function finishKnowledgeBaseBuild(
  kbId: string,
  persistent: boolean,
  total: number,
  skippedIds: string[]
): Promise<BuildKnowledgeBaseResult> {
  await syncKnowledgeBaseIndexStats(kbId, persistent);
  const ready = await finalizeKnowledgeBase(kbId, persistent);
  if (ready.status === "ready") {
    await completeReadyKnowledgeBase(kbId, persistent);
  }

  const failed = ready.status === "failed";
  const existingError = (await getKnowledgeBase(kbId))?.buildJob?.error?.trim();
  await updateBuildJob(kbId, persistent, {
    processedVideos: total,
    skippedCount: skippedIds.length,
    skippedVideoIds: skippedIds,
    currentVideoTitle: undefined,
    error: failed
      ? existingError ||
        "No videos could be indexed. Every selected video was missing a transcript or failed to index."
      : undefined,
  });

  const kb = (await getKnowledgeBase(kbId)) ?? ready;
  return { kb, skippedVideos: [] };
}

/**
 * Index one pending video, then hand the next video to a new invocation.
 * One step stays inside a single route duration instead of the whole library.
 */
export async function runKnowledgeBaseBuildJob(
  kbId: string,
  persistent: boolean,
  options?: { chain?: boolean }
): Promise<KbBuildJobResult> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb?.rankedVideos?.length) {
    throw new Error(`Knowledge base not found or missing source videos: ${kbId}`);
  }
  if (kb.status !== "building") {
    return { kb, skippedVideos: [] };
  }

  const owner = await acquireKbBuildLock(kbId);
  if (!owner) {
    return { kb, skippedVideos: [], busy: true };
  }

  const heartbeat = setInterval(() => {
    void refreshKbBuildLock(kbId, owner);
    void writeKbBuildHeartbeat(kbId);
  }, HEARTBEAT_MS);

  let result: KbBuildJobResult = { kb, skippedVideos: [] };
  let chainNext = false;
  const chainInProcess = options?.chain !== false;
  const startedAt = Date.now();
  try {
    await writeKbBuildHeartbeat(kbId);
    result = await runOneKnowledgeBaseBuildStep(kbId, persistent, kb.userId);
    let lastProcessed = result.kb.buildJob?.processedVideos ?? 0;

    while (
      chainInProcess &&
      result.kb.status === "building" &&
      !result.busy &&
      Date.now() - startedAt < INVOKE_CHAIN_BUDGET_MS
    ) {
      await new Promise((resolve) => setTimeout(resolve, kbIndexPaceDelayMs()));
      const beforeStep = lastProcessed;
      result = await runOneKnowledgeBaseBuildStep(kbId, persistent, kb.userId);
      lastProcessed = result.kb.buildJob?.processedVideos ?? beforeStep;
      if (result.busy) break;
      if (lastProcessed <= beforeStep) break;
    }

    chainNext = chainInProcess && result.kb.status === "building" && !result.busy;
    return result;
  } finally {
    clearInterval(heartbeat);
    await releaseKbBuildLock(kbId, owner);
    await clearKbBuildHeartbeat(kbId);
    if (chainNext) {
      await scheduleKbBuildContinuation(kbId);
    }
  }
}

async function runOneKnowledgeBaseBuildStep(
  kbId: string,
  persistent: boolean,
  usageUserId: string
): Promise<KbBuildJobResult> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb?.rankedVideos?.length) {
    throw new Error(`Knowledge base not found or missing source videos: ${kbId}`);
  }
  if (kb.status !== "building") {
    return { kb, skippedVideos: [] };
  }

  const skippedIds = [...(kb.buildJob?.skippedVideoIds ?? [])];
  const attempts = { ...(kb.buildJob?.attemptCounts ?? {}) };
  const pending = await pendingBuildVideos(kb);
  const total = kb.rankedVideos.length;
  const processedDone = total - pending.length;

  if (pending.length === 0) {
    return finishKnowledgeBaseBuild(kbId, persistent, total, skippedIds);
  }

  const video = pending[0];
  await updateBuildJob(kbId, persistent, {
    totalVideos: total,
    processedVideos: processedDone,
    currentVideoTitle: video.title,
    error: undefined,
  });

  let skipped = false;
  let reason: string | undefined;

  try {
    const indexed = await indexVideoInKnowledgeBase(kbId, video, persistent, usageUserId);
    skipped = indexed.skipped;
    reason = indexed.skipReason;
    if (skipped) skippedIds.push(video.videoId);
    delete attempts[video.videoId];
  } catch (err) {
    const message = err instanceof Error ? err.message : "Indexing failed";
    const nextAttempt = (attempts[video.videoId] ?? 0) + 1;
    const maxAttempts = maxAttemptsForError(err);
    if (nextAttempt < maxAttempts) {
      attempts[video.videoId] = nextAttempt;
      await updateBuildJob(kbId, persistent, {
        attemptCounts: attempts,
        currentVideoTitle: video.title,
        error:
          err instanceof TranscriptUnavailableError && err.kind === "transient"
            ? `"${video.title}" — ${err.message} (attempt ${nextAttempt}/${maxAttempts})`
            : undefined,
      });
      if (
        (err instanceof TranscriptUnavailableError && err.kind === "transient") ||
        isRetryableLlmError(err)
      ) {
        await new Promise((resolve) => setTimeout(resolve, transientBackoffMs(nextAttempt - 1)));
      }
      const current = (await getKnowledgeBase(kbId)) ?? kb;
      return { kb: current, skippedVideos: [] };
    }

    skipped = true;
    skippedIds.push(video.videoId);
    reason = `"${video.title}" skipped — ${message}`;
    delete attempts[video.videoId];
  }

  const doneCount = processedDone + 1;
  await updateBuildJob(kbId, persistent, {
    processedVideos: doneCount,
    skippedCount: skippedIds.length,
    skippedVideoIds: skippedIds,
    attemptCounts: attempts,
    currentVideoTitle: undefined,
    error: skipped ? reason : undefined,
  });

  if (pending.length > 1) {
    const current = (await getKnowledgeBase(kbId)) ?? kb;
    return {
      kb: current,
      skippedVideos:
        skipped && reason
          ? [{ videoId: video.videoId, title: video.title, reason }]
          : [],
    };
  }

  return finishKnowledgeBaseBuild(kbId, persistent, total, skippedIds);
}

export async function resetKbBuildJobProgress(
  kbId: string,
  persistent: boolean
): Promise<void> {
  await updateBuildJob(kbId, persistent, {
    processedVideos: 0,
    skippedCount: 0,
    currentVideoTitle: undefined,
    error: undefined,
  });
}

export async function prepareKnowledgeBaseRetry(
  kbId: string,
  persistent: boolean
): Promise<void> {
  await updateKnowledgeBase(
    kbId,
    (current) => ({
      ...current,
      status: "building",
      buildJob: createInitialBuildJob(current.rankedVideos?.length ?? 0),
    }),
    persistent
  );
}

export async function runKnowledgeBaseRetryJob(
  kbId: string,
  userId: string,
  persistent: boolean
): Promise<BuildKnowledgeBaseResult> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) throw new Error(`Knowledge base not found: ${kbId}`);
  if (kb.userId !== userId) throw new Error("You do not have access to this knowledge base");
  if (!kb.rankedVideos?.length) {
    throw new Error("This knowledge base cannot be retried because source videos were not saved.");
  }
  if (kb.status !== "failed") {
    throw new Error("Only failed knowledge bases can be retried.");
  }

  await prepareKnowledgeBaseRetry(kbId, persistent);

  const limit = 40;
  let result = await runKnowledgeBaseBuildJob(kbId, persistent, { chain: false });
  for (let step = 0; result.kb.status === "building" && !result.busy && step < limit; step += 1) {
    result = await runKnowledgeBaseBuildJob(kbId, persistent, { chain: false });
  }
  return result;
}

export function knowledgeBaseBuildStatus(kb: KnowledgeBaseRecord) {
  return knowledgeBaseBuildStatusFromRecord(kb);
}

export async function recordKbBuildVideoProgress(
  kbId: string,
  persistent: boolean,
  videoTitle: string,
  skipped: boolean
): Promise<void> {
  await updateKnowledgeBase(
    kbId,
    (current) => {
      const base =
        current.buildJob ?? createInitialBuildJob(current.rankedVideos?.length ?? 0);
      const buildJob: KbBuildJobState = {
        ...base,
        processedVideos: base.processedVideos + 1,
        skippedCount: skipped ? base.skippedCount + 1 : base.skippedCount,
        currentVideoTitle: videoTitle,
        updatedAt: new Date().toISOString(),
      };
      return { ...current, status: "building", buildJob };
    },
    persistent
  );
}
