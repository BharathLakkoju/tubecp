import { mapWithConcurrency } from "@/lib/concurrency";
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
import type { KbBuildJobState, KnowledgeBaseRecord, RankedVideo } from "@/lib/types";
import type { BuildKnowledgeBaseResult, SkippedKbVideo } from "./kb-build";

const INDEX_CONCURRENCY = 1;

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
        currentVideoTitle: patch.currentVideoTitle ?? base.currentVideoTitle,
        error: "error" in patch ? patch.error : base.error,
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

export async function executeKnowledgeBaseBuild(
  kbId: string,
  rankedVideos: RankedVideo[],
  persistent: boolean
): Promise<BuildKnowledgeBaseResult> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) throw new Error(`Knowledge base not found: ${kbId}`);

  const skippedVideos: SkippedKbVideo[] = [];
  const pending: RankedVideo[] = [];

  for (const video of rankedVideos) {
    const current = await getKnowledgeBase(kbId);
    if (current && (await isVideoIndexedInKnowledgeBase(current, video.videoId))) {
      continue;
    }
    pending.push(video);
  }

  const total = rankedVideos.length;
  let processed = total - pending.length;

  await updateBuildJob(kbId, persistent, {
    totalVideos: total,
    processedVideos: processed,
    error: undefined,
  });

  if (pending.length === 0) {
    await syncKnowledgeBaseIndexStats(kbId, persistent);
    const ready = await finalizeKnowledgeBase(kbId, persistent);
    return { kb: ready, skippedVideos };
  }

  const results = await mapWithConcurrency(
    pending,
    INDEX_CONCURRENCY,
    async (video) => {
      const result = await indexVideoInKnowledgeBase(kbId, video, persistent);
      processed += 1;
      await updateBuildJob(kbId, persistent, {
        processedVideos: processed,
        currentVideoTitle: video.title,
      });
      return result;
    }
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const video = pending[i];
    if (result.skipped) {
      skippedVideos.push({
        videoId: video.videoId,
        title: video.title,
        reason: result.skipReason ?? "Transcript unavailable",
      });
    }
  }

  await syncKnowledgeBaseIndexStats(kbId, persistent);
  await updateBuildJob(kbId, persistent, {
    processedVideos: total,
    skippedCount: skippedVideos.length,
    currentVideoTitle: undefined,
  });

  const ready = await finalizeKnowledgeBase(kbId, persistent);
  return { kb: ready, skippedVideos };
}

export async function startKnowledgeBaseBuild(
  topic: string,
  rankedVideos: RankedVideo[],
  userId: string,
  persistent: boolean
): Promise<KnowledgeBaseRecord> {
  if (isE2eStubMode()) {
    const { kb } = await stubKnowledgeBaseBuild(topic, rankedVideos, userId, persistent);
    return kb;
  }

  const kb = await createKnowledgeBase(topic, rankedVideos, userId, persistent);
  kb.buildJob = createInitialBuildJob(rankedVideos.length);
  await updateKnowledgeBase(kb.kbId, () => kb, persistent);
  await addUserKnowledgeBase(userId, kb.kbId);
  return kb;
}

export async function runKnowledgeBaseBuildJob(
  kbId: string,
  persistent: boolean
): Promise<BuildKnowledgeBaseResult> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb?.rankedVideos?.length) {
    throw new Error(`Knowledge base not found or missing source videos: ${kbId}`);
  }

  try {
    const result = await executeKnowledgeBaseBuild(kbId, kb.rankedVideos, persistent);

    if (result.kb.status === "ready") {
      await completeReadyKnowledgeBase(kbId, persistent);
    }

    await updateBuildJob(kbId, persistent, {
      processedVideos: kb.rankedVideos.length,
      skippedCount: result.skippedVideos.length,
      currentVideoTitle: undefined,
      error: undefined,
    });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Knowledge base build failed";
    const current = await getKnowledgeBase(kbId);

    if (current?.chunkIds.length) {
      await syncKnowledgeBaseIndexStats(kbId, persistent);
      const ready = await finalizeKnowledgeBase(kbId, persistent);
      await completeReadyKnowledgeBase(kbId, persistent);
      await updateBuildJob(kbId, persistent, {
        processedVideos: kb.rankedVideos.length,
        currentVideoTitle: undefined,
        error: undefined,
      });
      return { kb: ready, skippedVideos: [] };
    }

    const base = kb.buildJob ?? createInitialBuildJob(kb.rankedVideos?.length ?? 0);
    await updateKnowledgeBase(
      kbId,
      (record) => ({
        ...record,
        status: "failed",
        buildJob: {
          ...base,
          error: message,
          updatedAt: new Date().toISOString(),
        },
      }),
      persistent
    );
    throw err;
  }
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

  return runKnowledgeBaseBuildJob(kbId, persistent);
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
