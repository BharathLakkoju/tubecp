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
import { toVideoSummary } from "../youtube";
import type { VideoCandidate, VideoAnalysis } from "../types";

const ANALYSIS_SYSTEM = `You are a video relevance analyst. Score how substantively a YouTube video discusses the research topic based on transcript excerpts.

Respond with ONLY valid JSON:
{
  "relevanceScore": <0-100 integer>,
  "discussesTopic": <boolean>,
  "summary": "<one sentence: how this video helps answer the research topic>",
  "discussionLevel": "<mentioned|brief|substantial>",
  "evidence": [{ "timestamp": <seconds>, "text": "<short quote>", "relevance": <0-100> }]
}

Scoring rubric (be consistent):
- 80-100 substantial: deep discussion, examples, actionable detail on the topic
- 55-79 brief: meaningful segment but not the main focus
- 30-54 mentioned: passing reference only
- 0-29 not relevant: wrong topic, clickbait title, or generic content

discussesTopic=true only if score >= 40. Prefer precision but do not miss videos that clearly address the topic in the transcript.`;

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
      discussesTopic: Boolean(parsed.discussesTopic) || llmScore >= 40,
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
  const metadataScore = await scoreMetadataRelevance(topic, video, topicEmb);

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

  const userPrompt = `Research topic: "${topic}"

Video: "${video.title}" by ${video.channel}
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
  const discussionLevel = parsed?.discussionLevel ?? (semanticScore >= 55 ? "brief" : "mentioned");
  const discussesTopic =
    parsed?.discussesTopic ?? (llmScore >= 40 || semanticScore >= 52 || metadataScore >= 58);

  const finalScore = combineScores(
    llmScore,
    semanticScore,
    metadataScore,
    discussionLevel
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
    .filter(({ analysis }) => {
      if (analysis.relevanceScore < 42) return false;
      if (analysis.discussionLevel === "substantial" || analysis.discussionLevel === "brief") {
        return analysis.discussesTopic || (analysis.semanticScore ?? 0) >= 50;
      }
      return (
        analysis.discussesTopic &&
        analysis.relevanceScore >= 48 &&
        (analysis.semanticScore ?? 0) >= 45
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
