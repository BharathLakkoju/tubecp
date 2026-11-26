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
  /** Which search queries returned this video, and at what YouTube rank. */
  matches?: SearchMatch[];
}

export type QueryKind = "topic" | "subject" | "name" | "paraphrase";

export interface SearchMatch {
  query: string;
  kind: QueryKind;
  rank: number;
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

export type ScoreSource = "transcript" | "metadata_fallback";

export interface VideoAnalysis {
  videoId: string;
  relevanceScore: number;
  llmScore?: number;
  semanticScore?: number;
  metadataScore?: number;
  scoreSource?: ScoreSource;
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

export type UnreadReason = "no_captions" | "captions_failed" | "model_failed";

export type SkipReason = "over_search_cap" | "over_analyze_cap";

export interface RejectedVideo {
  video: VideoSummary;
  reason: "off_topic" | "mention_only";
  why: string;
}

export interface UnreadVideo {
  video: VideoSummary;
  reason: UnreadReason;
}

export interface SkippedVideo {
  video: VideoSummary;
  reason: SkipReason;
}

export interface ResearchResult {
  topic: string;
  queriesUsed: string[];
  videosSearched: number;
  allVideos: VideoSummary[];
  /** Videos whose transcript discusses the topic, already ordered. */
  rankedVideos: RankedVideo[];
  /** Present when this result was produced by transcript judgments. */
  speechSelection?: boolean;
  rejected?: RejectedVideo[];
  unread?: UnreadVideo[];
  skipped?: SkippedVideo[];
}

/** Saved research summary for lists and navigation. */
export interface SavedResearch {
  researchId: string;
  topic: string;
  createdAt: string;
  rankedVideoCount: number;
  videosSearched: number;
  kbId?: string;
}

export interface SavedResearchRecord extends SavedResearch {
  userId: string;
  result: ResearchResult;
  /** Optional knowledge base built from this research. */
  kbId?: string;
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
  /** Videos that failed indexing and must not be retried by the next step. */
  skippedVideoIds?: string[];
  /** Per-video failures so a transient error is retried once, then skipped. */
  attemptCounts?: Record<string, number>;
  startedAt: string;
  updatedAt: string;
  error?: string;
}

/** How transcript text is obtained during KB indexing. */
export type KbTranscriptMode = "captions" | "stt";

export interface KbBuildOptions {
  transcriptMode: KbTranscriptMode;
}

export type KbStatus = "building" | "finalizing" | "ready" | "failed";

export type KbBuildProgress = {
  total: number;
  indexed: number;
  skipped: number;
  failed: number;
  open: number;
};

export interface KnowledgeBase {
  kbId: string;
  topic: string;
  videoIds: string[];
  chunksIndexed: number;
  videosIndexed: number;
  totalMinutes: number;
  status: KbStatus;
  createdAt: string;
  persistent?: boolean;
  buildJob?: KbBuildJobState;
  buildOptions?: KbBuildOptions;
}

export interface KnowledgeBaseRecord extends KnowledgeBase {
  chunkIds: string[];
  userId: string;
  /** Original ranked videos kept so retry is always possible. */
  rankedVideos?: RankedVideo[];
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
