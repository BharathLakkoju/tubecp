import { generateText } from "./llm";
import { getTopicEmbedding } from "./semantic";
import { getTranscript } from "./transcript";
import { selectRelevantTranscriptExcerpts } from "./semantic";
import { toVideoSummary } from "../youtube";
import { getCachedJudgment, putCachedJudgment } from "../store";
import type {
  Evidence,
  RankedVideo,
  ResearchResult,
  SkipReason,
  UnreadReason,
  VideoCandidate,
  VideoSummary,
} from "../types";

export type Discussion = "mentioned" | "brief" | "substantial";

export type ModelReading = {
  discussesTopic: boolean;
  discussion: Discussion;
  why: string;
  evidence: Evidence[];
};

export type Judgment =
  | { state: "rejected"; reason: "off_topic" | "mention_only"; why: string }
  | { state: "selected"; discussion: "brief" | "substantial"; why: string; evidence: Evidence[] };

export type VideoState =
  | { state: "skipped"; video: VideoSummary; reason: SkipReason }
  | { state: "unread"; video: VideoSummary; reason: UnreadReason }
  | ({ state: "rejected"; video: VideoSummary } & Extract<Judgment, { state: "rejected" }>)
  | ({ state: "selected"; video: VideoSummary } & Extract<Judgment, { state: "selected" }>);

const JUDGMENT_SYSTEM = `You judge whether a YouTube video's spoken content discusses a research topic.

Use ONLY the transcript excerpts. The title can be clickbait. Do not treat the title as evidence.

Respond with ONLY valid JSON:
{
  "discussesTopic": <boolean>,
  "discussion": "<mentioned|brief|substantial>",
  "why": "<one sentence: how the spoken content relates to the topic>",
  "evidence": [{ "timestamp": <seconds>, "text": "<short quote from the excerpts>" }]
}

discussion is substantial when the excerpts are mainly about this topic.
discussion is brief when they cover it with some useful detail.
discussion is mentioned when the topic is named and not discussed.
discussesTopic is true only for brief or substantial coverage.
Quote evidence from the excerpts. Use an empty evidence array when nothing supports the topic.`;

export function parseModelReading(response: string): ModelReading | null {
  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as {
      discussesTopic?: boolean;
      discussion?: string;
      why?: string;
      summary?: string;
      evidence?: Array<{ timestamp?: number; text?: string }>;
    };
    const discussion = parsed.discussion;
    if (discussion !== "mentioned" && discussion !== "brief" && discussion !== "substantial") {
      return null;
    }
    const evidence = (parsed.evidence ?? [])
      .filter((item) => typeof item.text === "string" && item.text.trim().length > 0)
      .map((item) => ({
        timestamp: Number(item.timestamp) || 0,
        text: item.text!.trim(),
        relevance: discussion === "substantial" ? 80 : 60,
      }));
    return {
      discussesTopic: Boolean(parsed.discussesTopic) && discussion !== "mentioned",
      discussion,
      why: (parsed.why ?? parsed.summary ?? "").trim(),
      evidence,
    };
  } catch {
    return null;
  }
}

/** Include or exclude from the transcript reading alone. */
export function judge(reading: ModelReading): Judgment | "model_failed" {
  if (!reading.discussesTopic || reading.discussion === "mentioned") {
    return {
      state: "rejected",
      reason: reading.discussion === "mentioned" ? "mention_only" : "off_topic",
      why: reading.why || "The transcript does not discuss this topic.",
    };
  }
  if (reading.evidence.length === 0) return "model_failed";
  return {
    state: "selected",
    discussion: reading.discussion,
    why: reading.why || "The transcript discusses this topic.",
    evidence: reading.evidence,
  };
}

function openingExcerpts(segments: Array<{ start: number; text: string }>): string {
  return segments
    .slice(0, 40)
    .map((segment) => `[${Math.floor(segment.start)}s] ${segment.text}`)
    .join("\n")
    .slice(0, 6500);
}

export async function assessVideo(video: VideoCandidate, topic: string): Promise<VideoState> {
  const summary = toVideoSummary(video);
  const cached = await getCachedJudgment(topic, video.videoId);
  if (cached?.state === "selected" || cached?.state === "rejected") {
    return { ...cached, video: summary };
  }
  if (cached?.state === "unread" && cached.reason === "no_captions") {
    return { state: "unread", video: summary, reason: "no_captions" };
  }

  let transcript;
  try {
    transcript = await getTranscript(video.videoId, { budgetMs: 12_000, confirmTracks: false });
  } catch {
    return { state: "unread", video: summary, reason: "captions_failed" };
  }

  if (!transcript.segments.some((segment) => segment.text.trim())) {
    const unread = { state: "unread" as const, reason: "no_captions" as const };
    await putCachedJudgment(topic, video.videoId, unread);
    return { ...unread, video: summary };
  }

  let excerpts = "";
  try {
    const topicEmb = await getTopicEmbedding(topic);
    excerpts = await selectRelevantTranscriptExcerpts(topic, transcript.segments, 6500, topicEmb);
  } catch {
    excerpts = "";
  }
  if (!excerpts.trim()) excerpts = openingExcerpts(transcript.segments);
  if (!excerpts.trim()) {
    const unread = { state: "unread" as const, reason: "no_captions" as const };
    await putCachedJudgment(topic, video.videoId, unread);
    return { ...unread, video: summary };
  }

  let response = "";
  try {
    response = await generateText(
      JUDGMENT_SYSTEM,
      `Research topic: "${topic}"\n\nTranscript excerpts:\n${excerpts}`,
      { maxTokens: 800, temperature: 0.1, timeoutMs: 20_000, retries: 1, retryBackoffMs: 400 }
    );
  } catch {
    return { state: "unread", video: summary, reason: "model_failed" };
  }

  const reading = parseModelReading(response);
  if (!reading) return { state: "unread", video: summary, reason: "model_failed" };

  const judgment = judge(reading);
  if (judgment === "model_failed") {
    return { state: "unread", video: summary, reason: "model_failed" };
  }

  await putCachedJudgment(topic, video.videoId, judgment);
  return { ...judgment, video: summary };
}

function quoteCount(state: VideoState): number {
  return state.state === "selected" ? state.evidence.length : 0;
}

export function orderSelection(input: {
  topic: string;
  queriesUsed: string[];
  videosSearched: number;
  allVideos: VideoSummary[];
  assessments: VideoState[];
  pastAnalyzeCap: VideoCandidate[];
  pastSearchCap: VideoCandidate[];
  maxResults: number;
}): ResearchResult {
  const assessed = new Set(input.assessments.map((state) => state.video.videoId));
  const skipped: Array<Extract<VideoState, { state: "skipped" }>> = [
    ...input.pastAnalyzeCap
      .filter((video) => !assessed.has(video.videoId))
      .map((video) => ({
        state: "skipped" as const,
        video: toVideoSummary(video),
        reason: "over_analyze_cap" as const,
      })),
    ...input.pastSearchCap
      .filter((video) => !assessed.has(video.videoId))
      .map((video) => ({
        state: "skipped" as const,
        video: toVideoSummary(video),
        reason: "over_search_cap" as const,
      })),
  ];

  const selected = input.assessments
    .filter((state): state is Extract<VideoState, { state: "selected" }> => state.state === "selected")
    .sort((a, b) => {
      if (a.discussion !== b.discussion) return a.discussion === "substantial" ? -1 : 1;
      return quoteCount(b) - quoteCount(a);
    });

  const rankedVideos = toRankedVideos(selected.slice(0, input.maxResults));
  const rejected = input.assessments.filter(
    (state): state is Extract<VideoState, { state: "rejected" }> => state.state === "rejected"
  );
  const unread = input.assessments.filter(
    (state): state is Extract<VideoState, { state: "unread" }> => state.state === "unread"
  );

  return {
    topic: input.topic,
    queriesUsed: input.queriesUsed,
    videosSearched: input.videosSearched,
    allVideos: input.allVideos,
    rankedVideos,
    speechSelection: true,
    rejected: rejected.map(({ video, reason, why }) => ({ video, reason, why })),
    unread: unread.map(({ video, reason }) => ({ video, reason })),
    skipped: skipped.map(({ video, reason }) => ({ video, reason })),
  };
}

export function toRankedVideos(
  videos: Array<Extract<VideoState, { state: "selected" }>>
): RankedVideo[] {
  return videos.map((video) => ({
    ...video.video,
    whyRelevant: video.evidence[0]
      ? `${video.why} “${video.evidence[0].text}”`
      : video.why,
    discussionLevel: video.discussion,
    relevanceScore: video.discussion === "substantial" ? 2 : 1,
  }));
}

export function selectionNeedsRetry(result: ResearchResult): boolean {
  return (result.unread ?? []).some(
    (video) => video.reason === "captions_failed" || video.reason === "model_failed"
  );
}
