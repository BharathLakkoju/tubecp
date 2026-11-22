import type { KnowledgeBase } from "@/lib/types";

export interface SkippedKbVideo {
  videoId: string;
  title: string;
  reason: string;
}

export interface BuildKnowledgeBaseResult {
  kb: KnowledgeBase;
  skippedVideos: SkippedKbVideo[];
}
