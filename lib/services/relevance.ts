import { generateText } from "./llm";
import { getTranscript } from "./transcript";
import {
  getTopicEmbedding,
  scoreMetadataRelevance,
  scoreTranscriptRelevance,
  selectRelevantTranscriptExcerpts,
  combineScores,
  preRankCandidates,
} from "./semantic";
import { buildMetadataOnlyAnalysis, scoreMetadataOnly } from "./metadata-analysis";
import { getCachedAnalysis, cacheAnalysis, hashTopic } from "../store";
import { topicKeywordScore } from "./research-scoring";
import { UNDERSTANDING_RANK_MIN } from "./video-understanding";
import { toVideoSummary } from "../youtube";
import type { ScoreSource, VideoCandidate, VideoAnalysis } from "../types";

const ANALYSIS_CACHE_VERSION = "understand-v1";

const ANALYSIS_SYSTEM = `You score whether a YouTube video's spoken content answers a research topic.

Use ONLY the transcript excerpts. The title can be clickbait.
If the excerpts do not discuss the topic, score 0-34 and set discussesTopic=false even when the title matches.

Respond with ONLY valid JSON:
{
  "relevanceScore": <0-100 integer>,
  "discussesTopic": <boolean>,
  "summary": "<one sentence: how the spoken content helps answer the research topic>",
  "discussionLevel": "<mentioned|brief|substantial>",
  "evidence": [{ "timestamp": <seconds>, "text": "<short quote from the excerpts>", "relevance": <0-100> }]
}

Scoring rubric:
- 75-100 substantial: excerpts are mainly about this topic with usable detail
- 50-74 brief: excerpts cover the topic with some useful content
- 35-49 mentioned: the topic appears but coverage is shallow
- 0-34 none: excerpts are a different topic, or too thin to tell

discussesTopic is true only when the excerpts support the topic.
Quote evidence from the excerpts. Use an empty evidence array when nothing supports the topic.`;

function parseAnalysisJson(
  response: string,
  videoId: string
): Omit<VideoAnalysis, "semanticScore" | "metadataScore" | "llmScore"> | null {
  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const llmScore = Math.min(100, Math.max(0, Number(parsed.relevanceScore) || 0));
    const discussionLevel = parsed.discussionLevel ?? "mentioned";

    return {
      videoId,
      relevanceScore: llmScore,
      discussesTopic: Boolean(parsed.discussesTopic),
      summary: parsed.summary ?? "",
      discussionLevel,
      evidence: (parsed.evidence ?? []).map(
        (e: { timestamp: number; text: string; relevance: number }) => ({
          timestamp: e.timestamp,
          text: e.text,
          relevance: e.relevance,
        })
      ),
    };
  } catch {
    return null;
  }
}

async function cacheAndReturn(
  topicHash: string,
  videoId: string,
  analysis: VideoAnalysis
): Promise<VideoAnalysis> {
  await cacheAnalysis(topicHash, videoId, analysis);
  return analysis;
}

export async function analyzeVideo(
  video: VideoCandidate,
  topic: string
): Promise<VideoAnalysis> {
  const topicHash = hashTopic(`${ANALYSIS_CACHE_VERSION}:${topic.toLowerCase().trim()}`);
  const cached = await getCachedAnalysis(topicHash, video.videoId);
  if (cached) return cached;

  let topicEmb: number[];
  try {
    topicEmb = await getTopicEmbedding(topic);
  } catch (err) {
    console.warn(`Topic embedding failed for analyze (${video.videoId}), metadata-only:`, err);
    return cacheAndReturn(
      topicHash,
      video.videoId,
      buildMetadataOnlyAnalysis(video, topic)
    );
  }

  const keywordScore = topicKeywordScore(topic, `${video.title} ${video.description ?? ""}`);
  let metadataScore = scoreMetadataOnly(video, topic).metadataScore;

  try {
    const embeddingMetaScore = await scoreMetadataRelevance(topic, video, topicEmb);
    metadataScore = Math.min(
      100,
      Math.round(embeddingMetaScore * 0.55 + keywordScore * 0.45)
    );
  } catch (err) {
    console.warn(`Metadata embedding failed for ${video.videoId}, keyword-only metadata:`, err);
  }

  if (video.searchRank && video.searchRank <= 5) {
    metadataScore = Math.min(100, metadataScore + 12);
  }

  let semanticScore = 0;
  let transcriptText = "";
  let scoreSource: ScoreSource = "metadata_fallback";

  try {
    const transcript = await getTranscript(video.videoId, {
      budgetMs: 12_000,
      confirmTracks: false,
    });
    semanticScore = await scoreTranscriptRelevance(topic, transcript.segments, topicEmb);
    transcriptText = await selectRelevantTranscriptExcerpts(
      topic,
      transcript.segments,
      6500,
      topicEmb
    );
    scoreSource = "transcript";
  } catch {
    return cacheAndReturn(
      topicHash,
      video.videoId,
      buildMetadataOnlyAnalysis(video, topic, {
        keywordScore,
        metadataScore,
        semanticScore: 0,
      })
    );
  }

  if (!transcriptText.trim()) {
    return cacheAndReturn(
      topicHash,
      video.videoId,
      buildMetadataOnlyAnalysis(video, topic, {
        keywordScore,
        metadataScore,
        semanticScore: 0,
      })
    );
  }

  const signalFallback = () =>
    buildMetadataOnlyAnalysis(video, topic, {
      keywordScore,
      metadataScore,
      semanticScore,
    });

  const userPrompt = `Research topic: "${topic}"

Claimed title: "${video.title}" (do not trust this over the excerpts)
Channel: ${video.channel}

Transcript excerpts:
${transcriptText}`;

  let response: string;
  try {
    response = await generateText(ANALYSIS_SYSTEM, userPrompt, {
      maxTokens: 1000,
      temperature: 0.1,
      timeoutMs: 20_000,
      retries: 1,
      retryBackoffMs: 400,
    });
  } catch (err) {
    console.warn(`LLM analyze failed for ${video.videoId}, metadata-only:`, err);
    return cacheAndReturn(topicHash, video.videoId, signalFallback());
  }

  const parsed = parseAnalysisJson(response, video.videoId);

  const llmScore = parsed?.relevanceScore ?? semanticScore;
  const discussionLevel = parsed?.discussionLevel ?? (semanticScore >= 50 ? "brief" : "mentioned");
  const evidence = parsed?.evidence ?? [];
  const discussesTopic =
    parsed?.discussesTopic ?? (llmScore >= 50 && (semanticScore >= 40 || evidence.length > 0));

  const finalScore = combineScores(
    llmScore,
    semanticScore,
    metadataScore,
    discussionLevel,
    video.searchScore ?? 0,
    scoreSource
  );

  const analysis: VideoAnalysis = {
    videoId: video.videoId,
    relevanceScore: finalScore,
    llmScore,
    semanticScore,
    metadataScore,
    scoreSource,
    discussesTopic,
    summary: parsed?.summary ?? `Spoken content match ${semanticScore}%`,
    discussionLevel,
    evidence,
  };

  return cacheAndReturn(topicHash, video.videoId, analysis);
}

export { preRankCandidates };

export function rankVideos(
  topic: string,
  queriesUsed: string[],
  videosSearched: number,
  analyses: Array<{ video: VideoCandidate; analysis: VideoAnalysis }>,
  maxVideos = 15,
  allCandidates: VideoCandidate[] = []
) {
  const rankedVideos = analyses
    .filter(({ analysis }) => analysis.relevanceScore >= UNDERSTANDING_RANK_MIN)
    .sort((a, b) => {
      const scoreDelta = b.analysis.relevanceScore - a.analysis.relevanceScore;
      if (scoreDelta !== 0) return scoreDelta;
      return (b.video.searchScore ?? 0) - (a.video.searchScore ?? 0);
    })
    .slice(0, maxVideos)
    .map(({ video, analysis }) => ({
      ...toVideoSummary(video),
      relevanceScore: analysis.relevanceScore,
      whyRelevant: analysis.summary,
      discussionLevel: (
        analysis.discussionLevel === "substantial" ||
        (analysis.semanticScore ?? 0) >= 65
          ? "substantial"
          : "brief"
      ) as "brief" | "substantial",
    }));

  const scraped =
    allCandidates.length > 0 ? allCandidates : analyses.map(({ video }) => video);

  return {
    topic,
    queriesUsed,
    videosSearched,
    allVideos: scraped.map(toVideoSummary),
    rankedVideos,
  };
}
