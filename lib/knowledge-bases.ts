import type { KnowledgeBase, KnowledgeBaseRecord } from "./types";

export function toKnowledgeBaseSummary(kb: KnowledgeBaseRecord): KnowledgeBase {
  return {
    kbId: kb.kbId,
    topic: kb.topic,
    videoIds: kb.videoIds,
    chunksIndexed: kb.chunksIndexed,
    videosIndexed: kb.videosIndexed,
    totalMinutes: kb.totalMinutes,
    status: kb.status,
    createdAt: kb.createdAt,
    buildJob: kb.buildJob,
    buildOptions: kb.buildOptions,
  };
}
