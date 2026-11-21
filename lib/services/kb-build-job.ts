import { isE2eStubMode, stubKnowledgeBaseBuild } from "@/lib/e2e-stub";
import { requestKbBuild } from "@/lib/inngest/functions";
import {
  createKnowledgeBase,
  finalizeKnowledgeBase,
  syncKnowledgeBaseIndexStats,
} from "@/lib/services/knowledge-base";
import { ensureKbWelcomeMessage, refreshKbWelcomeMessage } from "@/lib/services/kb-chat";
import { addUserKnowledgeBase, getKnowledgeBase, updateKnowledgeBase } from "@/lib/store";
import { knowledgeBaseBuildStatusFromRecord } from "@/lib/kb-build-status";
import type { KbBuildJobState, KbBuildOptions, KnowledgeBaseRecord, RankedVideo } from "@/lib/types";
import type { BuildKnowledgeBaseResult } from "./kb-build";
import { kbPipelineForUser } from "@/lib/pipeline/config";
import { tryGetRun } from "@/lib/pipeline/jobs";
import { assertCanStartBuild } from "@/lib/pipeline/limits";
import { kickQueueBuild, retryQueueBuild, startQueueBuild } from "@/lib/pipeline/orchestrate";

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

async function completeReadyKnowledgeBase(kbId: string): Promise<void> {
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
  await completeReadyKnowledgeBase(kbId);
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

  if (kbPipelineForUser(userId) === "queue") {
    await assertCanStartBuild(userId);
  }

  const kb = await createKnowledgeBase(topic, rankedVideos, userId, persistent, buildOptions);
  kb.buildJob = createInitialBuildJob(rankedVideos.length);
  await updateKnowledgeBase(kb.kbId, () => kb, persistent);
  await addUserKnowledgeBase(userId, kb.kbId);

  if (kbPipelineForUser(userId) === "queue") {
    await startQueueBuild(kb, rankedVideos, persistent);
  }

  return kb;
}

export type KbBuildJobResult = BuildKnowledgeBaseResult & { busy?: boolean };

/**
 * Ensure a `building` KB is running on the durable runner.
 * Queue-mode builds are kicked on SQS; everyone else is enqueued on Inngest.
 */
export async function runKnowledgeBaseBuildJob(
  kbId: string,
  persistent: boolean
): Promise<KbBuildJobResult> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb?.rankedVideos?.length) {
    throw new Error(`Knowledge base not found or missing source videos: ${kbId}`);
  }
  if (kb.status !== "building") {
    return { kb, skippedVideos: [] };
  }

  const queueRun = await tryGetRun(kbId);
  if (queueRun) {
    await kickQueueBuild(kbId);
    const latest = (await getKnowledgeBase(kbId)) ?? kb;
    return { kb: latest, skippedVideos: [], busy: latest.status === "building" };
  }

  await requestKbBuild(kbId, persistent);
  const latest = (await getKnowledgeBase(kbId)) ?? kb;
  return { kb: latest, skippedVideos: [], busy: latest.status === "building" };
}

export async function resetKbBuildJobProgress(
  kbId: string,
  persistent: boolean
): Promise<void> {
  await updateKnowledgeBase(
    kbId,
    (current) => {
      const base: KbBuildJobState =
        current.buildJob ?? createInitialBuildJob(current.rankedVideos?.length ?? 0);
      return {
        ...current,
        buildJob: {
          ...base,
          processedVideos: 0,
          skippedCount: 0,
          currentVideoTitle: undefined,
          error: undefined,
          updatedAt: new Date().toISOString(),
        },
      };
    },
    persistent
  );
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

  if (kbPipelineForUser(userId) === "queue") {
    await retryQueueBuild(kb, persistent);
    const latest = (await getKnowledgeBase(kbId)) ?? kb;
    return { kb: latest, skippedVideos: [] };
  }

  await prepareKnowledgeBaseRetry(kbId, persistent);
  await requestKbBuild(kbId, persistent);
  const latest = (await getKnowledgeBase(kbId)) ?? kb;
  return { kb: latest, skippedVideos: [] };
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
      const base = current.buildJob ?? createInitialBuildJob(current.rankedVideos?.length ?? 0);
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
