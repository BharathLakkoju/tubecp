import { requestKbBuild } from "@/lib/inngest/functions";
import { kbPipelineForUser } from "@/lib/pipeline/config";
import { getJobStore, type KbBuildRun } from "@/lib/pipeline/jobs";
import { assertCanStartBuild } from "@/lib/pipeline/limits";
import { kickQueueBuild, retryQueueBuild, startQueueBuild } from "@/lib/pipeline/orchestrate";
import { getKnowledgeBase, updateKnowledgeBase } from "@/lib/store";

export type BuildTransport = {
  start(run: KbBuildRun): Promise<void>;
  kick(kbId: string): Promise<void>;
  retry(run: KbBuildRun): Promise<void>;
};

const queueTransport: BuildTransport = {
  async start(run) {
    const kb = await getKnowledgeBase(run.kbId);
    if (!kb?.rankedVideos?.length) {
      throw new Error(`Knowledge base not found or missing source videos: ${run.kbId}`);
    }
    await startQueueBuild(kb, kb.rankedVideos, run.persistent);
  },
  kick(kbId) {
    return kickQueueBuild(kbId);
  },
  async retry(run) {
    const kb = await getKnowledgeBase(run.kbId);
    if (!kb) throw new Error(`Knowledge base not found: ${run.kbId}`);
    await retryQueueBuild(kb, run.persistent);
  },
};

const inngestTransport: BuildTransport = {
  async start(run) {
    await requestKbBuild(run.kbId, run.persistent);
  },
  async kick(kbId) {
    const kb = await getKnowledgeBase(kbId);
    if (kb?.rankedVideos?.length) {
      const store = getJobStore();
      if (!(await store.getRun(kbId))) {
        await store.insertRun({
          kbId,
          userId: kb.userId,
          persistent: kb.persistent ?? false,
          transcriptMode: kb.buildOptions?.transcriptMode ?? "captions",
          videos: kb.rankedVideos,
        });
      }
    }
    await requestKbBuild(kbId, kb?.persistent ?? false);
  },
  async retry(run) {
    await assertCanStartBuild(run.userId);
    const kb = await getKnowledgeBase(run.kbId);
    if (!kb?.rankedVideos?.length) {
      throw new Error(`Knowledge base not found or missing source videos: ${run.kbId}`);
    }
    const store = getJobStore();
    const existing = await store.getRun(run.kbId);
    if (existing) {
      await store.resetRetryableJobs(run.kbId);
    } else {
      await store.insertRun({
        kbId: run.kbId,
        userId: run.userId,
        persistent: run.persistent,
        transcriptMode: kb.buildOptions?.transcriptMode ?? "captions",
        videos: kb.rankedVideos,
      });
    }
    await updateKnowledgeBase(
      run.kbId,
      (current) => ({ ...current, status: "building" }),
      run.persistent
    );
    await requestKbBuild(run.kbId, run.persistent);
  },
};

export function buildTransportForUser(userId: string): BuildTransport {
  return kbPipelineForUser(userId) === "queue" ? queueTransport : inngestTransport;
}
