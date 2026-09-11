export interface VideoCandidate {
  videoId: string;
  title: string;
  channel: string;
  url: string;
  publishedAt: string;
  duration?: string;
  description?: string;
}

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface Transcript {
  videoId: string;
  language: string;
  segments: TranscriptSegment[];
}

export interface Evidence {
  timestamp: number;
  text: string;
  relevance: number;
}

export interface VideoAnalysis {
  videoId: string;
  relevanceScore: number;
  llmScore?: number;
  semanticScore?: number;
  metadataScore?: number;
  discussesTopic: boolean;
  summary: string;
  evidence: Evidence[];
  discussionLevel: "mentioned" | "brief" | "substantial";
}

export interface VideoSummary {
  videoId: string;
  title: string;
  channel: string;
  url: string;
  thumbnailUrl: string;
}

export interface RankedVideo extends VideoSummary {
  relevanceScore: number;
  whyRelevant: string;
  discussionLevel: "brief" | "substantial";
}

export interface ResearchResult {
  topic: string;
  queriesUsed: string[];
  videosSearched: number;
  allVideos: VideoSummary[];
  rankedVideos: RankedVideo[];
}

/** Partial research data streamed to the UI as each pipeline step completes. */
export interface ResearchLiveState {
  queries: string[];
  allVideos: VideoSummary[];
  analyzedVideos: VideoSummary[];
  analyzedScores: Record<string, number>;
}

export interface TranscriptChunk {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  timestamp: number;
  text: string;
  embedding?: number[];
}

export interface KnowledgeBase {
  kbId: string;
  topic: string;
  videoIds: string[];
  chunksIndexed: number;
  videosIndexed: number;
  totalMinutes: number;
  status: "building" | "ready" | "failed";
  createdAt: string;
}

export interface KnowledgeBaseRecord extends KnowledgeBase {
  chunkIds: string[];
  userId: string;
}

export interface ChatSource {
  videoId: string;
  title: string;
  timestamp: number;
  url: string;
  excerpt: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  gaps?: string;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export type AppPhase = "search" | "results" | "building" | "chat";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  gaps?: string;
}
