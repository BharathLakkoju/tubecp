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
  return runKnowledgeBaseBuildJob(kb.kbId, persistent);
}

export async function resumeKnowledgeBaseBuild(
  kbId: string,
  userId: string,
  persistent = false
): Promise<BuildKnowledgeBaseResult> {
  return runKnowledgeBaseRetryJob(kbId, userId, persistent);
}
