import {
  runKnowledgeBaseBuildJob,
  runKnowledgeBaseRetryJob,
  startKnowledgeBaseBuild,
} from "@/lib/services/kb-build-job";
import { getKnowledgeBase } from "@/lib/store";
import type { RankedVideo } from "@/lib/types";

export interface SkippedKbVideo {
  videoId: string;
  title: string;
  reason: string;
}

export interface BuildKnowledgeBaseResult {
  kb: import("@/lib/types").KnowledgeBaseRecord;
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
  await runKnowledgeBaseBuildJob(kb.kbId, persistent);
  const latest = (await getKnowledgeBase(kb.kbId)) ?? kb;
  return { kb: latest, skippedVideos: [] };
}

export async function resumeKnowledgeBaseBuild(
  kbId: string,
  userId: string,
  persistent = false
): Promise<BuildKnowledgeBaseResult> {
  return runKnowledgeBaseRetryJob(kbId, userId, persistent);
}
