import {
  runKnowledgeBaseBuildJob,
  runKnowledgeBaseRetryJob,
  startKnowledgeBaseBuild,
} from "@/lib/services/kb-build-job";
import type { KnowledgeBaseRecord, RankedVideo } from "@/lib/types";

export interface SkippedKbVideo {
  videoId: string;
  title: string;
  reason: string;
}

export interface BuildKnowledgeBaseResult {
  kb: KnowledgeBaseRecord;
  skippedVideos: SkippedKbVideo[];
}

/** @deprecated Prefer startKnowledgeBaseBuild + runKnowledgeBaseBuildJob for async builds. */
export async function buildKnowledgeBaseFromVideos(
  topic: string,
  rankedVideos: RankedVideo[],
  userId: string,
  persistent = false
): Promise<BuildKnowledgeBaseResult> {
  const kb = await startKnowledgeBaseBuild(topic, rankedVideos, userId, persistent);
  if (kb.status === "ready") {
    return { kb, skippedVideos: [] };
  }
  return runKnowledgeBaseBuildToCompletion(kb.kbId, persistent);
}

async function runKnowledgeBaseBuildToCompletion(
  kbId: string,
  persistent: boolean
): Promise<BuildKnowledgeBaseResult> {
  const limit = 40;
  let result = await runKnowledgeBaseBuildJob(kbId, persistent, { chain: false });
  for (let step = 0; result.kb.status === "building" && !result.busy && step < limit; step += 1) {
    result = await runKnowledgeBaseBuildJob(kbId, persistent, { chain: false });
  }
  return result;
}

export async function resumeKnowledgeBaseBuild(
  kbId: string,
  userId: string,
  persistent = false
): Promise<BuildKnowledgeBaseResult> {
  return runKnowledgeBaseRetryJob(kbId, userId, persistent);
}
