export interface VideoCandidate {
  videoId: string;
  title: string;
  channel: string;
  url: string;
  publishedAt: string;
  duration?: string;
  description?: string;
  /** Best position across search queries (1 = top result). */
  searchRank?: number;
  /** Composite score from YouTube search positions across queries. */
  searchScore?: number;
  /** How many expanded queries returned this video. */
  matchedQueries?: number;
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

export interface KbBuildJobState {
  totalVideos: number;
  processedVideos: number;
  currentVideoTitle?: string;
  skippedCount: number;
  startedAt: string;
  updatedAt: string;
  error?: string;
}

/** How transcript text is obtained during KB indexing. */
export type KbTranscriptMode = "captions" | "stt";

export interface KbBuildOptions {
  transcriptMode: KbTranscriptMode;
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
  buildJob?: KbBuildJobState;
  buildOptions?: KbBuildOptions;
}

export interface KnowledgeBaseRecord extends KnowledgeBase {
  chunkIds: string[];
  userId: string;
  /** Original ranked videos kept for failed-build retry. */
  rankedVideos?: RankedVideo[];
  chatMessages?: ChatMessage[];
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
  /** Indexed KB onboarding copy — not an LLM answer. */
  kind?: "welcome";
}
