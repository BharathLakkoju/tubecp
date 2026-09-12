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
import { getCachedAnalysis, cacheAnalysis, hashTopic } from "../store";
import { isStrongYouTubeMatch, topicKeywordScore } from "./research-scoring";
import { toVideoSummary } from "../youtube";
import type { VideoCandidate, VideoAnalysis } from "../types";

const ANALYSIS_SYSTEM = `You are a video relevance analyst for YouTube research. Score how well a video helps someone answer the research topic.

Respond with ONLY valid JSON:
{
  "relevanceScore": <0-100 integer>,
  "discussesTopic": <boolean>,
  "summary": "<one sentence: how this video helps answer the research topic>",
  "discussionLevel": "<mentioned|brief|substantial>",
  "evidence": [{ "timestamp": <seconds>, "text": "<short quote>", "relevance": <0-100> }]
}

Scoring rubric:
- 75-100 substantial: the video is mainly about this topic with actionable detail
- 50-74 brief: meaningful coverage, even if the format is a vlog or build diary
- 35-49 mentioned: partially relevant, title/thumbnail match but shallow coverage
- 0-34 not relevant: wrong topic or misleading title

Important:
- "How I built X" / solo developer journey videos ARE relevant when they match the topic
- Do not penalize conversational tone or tangents if the core question is answered
- discussesTopic=true when score >= 35 OR the title clearly matches the research question
- Prefer recall over precision — include videos a human would click on YouTube search`;

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
      discussesTopic: Boolean(parsed.discussesTopic) || llmScore >= 35,
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

export async function analyzeVideo(
  video: VideoCandidate,
  topic: string
): Promise<VideoAnalysis> {
  const topicHash = hashTopic(topic.toLowerCase().trim());
  const cached = await getCachedAnalysis(topicHash, video.videoId);
  if (cached) return cached;

  const topicEmb = await getTopicEmbedding(topic);
  const embeddingMetaScore = await scoreMetadataRelevance(topic, video, topicEmb);
  const keywordScore = topicKeywordScore(topic, `${video.title} ${video.description ?? ""}`);
  let metadataScore = Math.min(
    100,
    Math.round(embeddingMetaScore * 0.55 + keywordScore * 0.45)
  );

  if (video.searchRank && video.searchRank <= 5) {
    metadataScore = Math.min(100, metadataScore + 12);
  }

  let semanticScore = 0;
  let transcriptText = "";

  try {
    const transcript = await getTranscript(video.videoId);
    semanticScore = await scoreTranscriptRelevance(topic, transcript.segments, topicEmb);
    transcriptText = await selectRelevantTranscriptExcerpts(
      topic,
      transcript.segments,
      6500,
      topicEmb
    );
  } catch {
    transcriptText = `Title: ${video.title}\nChannel: ${video.channel}\nDescription: ${video.description ?? "N/A"}`;
    semanticScore = Math.round(metadataScore * 0.85);
  }

  const searchContext =
    video.searchRank !== undefined
      ? `YouTube search rank: #${video.searchRank} (appeared in ${video.matchedQueries ?? 1} queries)`
      : "YouTube search rank: unknown";

  const userPrompt = `Research topic: "${topic}"

Video: "${video.title}" by ${video.channel}
${searchContext}
Title/metadata keyword match: ${keywordScore}/100
Metadata relevance (embedding): ${metadataScore}/100
Transcript relevance (embedding): ${semanticScore}/100

Most relevant transcript excerpts:
${transcriptText || "(no transcript available)"}`;

  const response = await generateText(ANALYSIS_SYSTEM, userPrompt, {
    maxTokens: 1000,
    temperature: 0.1,
  });

  const parsed = parseAnalysisJson(response, video.videoId);

  const llmScore = parsed?.relevanceScore ?? Math.round(metadataScore * 0.6 + semanticScore * 0.4);
  const discussionLevel = parsed?.discussionLevel ?? (semanticScore >= 50 ? "brief" : "mentioned");
  const strongSearch = isStrongYouTubeMatch(video, metadataScore);
  const discussesTopic =
    parsed?.discussesTopic ??
    (llmScore >= 35 ||
      semanticScore >= 48 ||
      metadataScore >= 55 ||
      keywordScore >= 60 ||
      strongSearch);

  const finalScore = combineScores(
    llmScore,
    semanticScore,
    metadataScore,
    discussionLevel,
    video.searchScore ?? 0
  );

  const analysis: VideoAnalysis = {
    videoId: video.videoId,
    relevanceScore: finalScore,
    llmScore,
    semanticScore,
    metadataScore,
    discussesTopic,
    summary: parsed?.summary ?? `Relevant content found (semantic match ${semanticScore}%)`,
    discussionLevel,
    evidence: parsed?.evidence ?? [],
  };

  await cacheAnalysis(topicHash, video.videoId, analysis);
  return analysis;
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
    .filter(({ video, analysis }) => {
      const semantic = analysis.semanticScore ?? 0;
      const metadata = analysis.metadataScore ?? 0;
      const strongSearch = isStrongYouTubeMatch(video, metadata);

      if (analysis.relevanceScore < 35 && !analysis.discussesTopic) return false;

      if (analysis.relevanceScore >= 38) return true;
      if (strongSearch && analysis.discussesTopic) return true;
      if (strongSearch && metadata >= 50) return true;

      if (analysis.discussionLevel === "substantial" || analysis.discussionLevel === "brief") {
        return analysis.discussesTopic || semantic >= 45;
      }

      return (
        analysis.discussesTopic &&
        analysis.relevanceScore >= 40 &&
        (semantic >= 40 || metadata >= 55)
      );
    })
    .sort((a, b) => b.analysis.relevanceScore - a.analysis.relevanceScore)
    .slice(0, Math.min(maxVideos, 20))
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
