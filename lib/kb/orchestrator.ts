import { isE2eStubMode, stubKnowledgeBaseBuild } from "@/lib/e2e-stub";
import { captureException } from "@/lib/observe";
import { knowledgeBaseBuildStatusFromRecord } from "@/lib/kb-build-status";
import { withJobProgress } from "@/lib/kb/progress";
import { buildTransportForUser } from "@/lib/kb/transports";
import { getJobStore } from "@/lib/pipeline/jobs";
import { assertCanStartBuild } from "@/lib/pipeline/limits";
import {
  createKnowledgeBase,
  finalizeKnowledgeBase,
  syncKnowledgeBaseIndexStats,
} from "@/lib/services/knowledge-base";
import { ensureKbWelcomeMessage, refreshKbWelcomeMessage } from "@/lib/services/kb-chat";
import { addUserKnowledgeBase, getKnowledgeBase, updateKnowledgeBase } from "@/lib/store";
import type { KbBuildOptions, KnowledgeBaseRecord, RankedVideo } from "@/lib/types";
import type { BuildKnowledgeBaseResult } from "@/lib/services/kb-build";

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

  await assertCanStartBuild(userId);

  const kb = await createKnowledgeBase(topic, rankedVideos, userId, persistent, buildOptions);
  await addUserKnowledgeBase(userId, kb.kbId);

  try {
    await getJobStore().insertRun({
      kbId: kb.kbId,
      userId,
      persistent,
      transcriptMode: kb.buildOptions?.transcriptMode ?? "captions",
      videos: rankedVideos,
    });
    const run = await getJobStore().getRun(kb.kbId);
    if (!run) {
      throw new Error(`Failed to persist build run for ${kb.kbId}`);
    }
    await buildTransportForUser(userId).start(run);
  } catch (err) {
    captureException(err, { kbId: kb.kbId, userId, stage: "startKbBuild" });
    throw err;
  }

  return (await getKnowledgeBase(kb.kbId)) ?? kb;
}

export type KbBuildJobResult = BuildKnowledgeBaseResult & { busy?: boolean };

export async function runKnowledgeBaseBuildJob(
  kbId: string,
  persistent: boolean
): Promise<KbBuildJobResult> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb?.rankedVideos?.length) {
    throw new Error(`Knowledge base not found or missing source videos: ${kbId}`);
  }
  if (kb.status === "ready" || kb.status === "failed") {
    return { kb, skippedVideos: [] };
  }

  await buildTransportForUser(kb.userId).kick(kbId);
  const latest = (await getKnowledgeBase(kbId)) ?? kb;
  return {
    kb: latest,
    skippedVideos: [],
    busy: latest.status === "building" || latest.status === "finalizing",
  };
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

  const store = getJobStore();
  const existing = await store.getRun(kbId);
  const run = existing ?? {
    kbId,
    userId,
    status: "failed" as const,
    persistent,
    transcriptMode: kb.buildOptions?.transcriptMode ?? "captions",
    totalVideos: kb.rankedVideos.length,
    createdAt: kb.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await buildTransportForUser(userId).retry({ ...run, persistent });
  const latest = (await getKnowledgeBase(kbId)) ?? kb;
  return { kb: latest, skippedVideos: [] };
}

export function knowledgeBaseBuildStatus(kb: KnowledgeBaseRecord) {
  return knowledgeBaseBuildStatusFromRecord(kb);
}

export async function knowledgeBaseBuildStatusResolved(kb: KnowledgeBaseRecord) {
  return knowledgeBaseBuildStatusFromRecord(await withJobProgress(kb));
}
