import { generateText } from "./llm";
import { getTranscript, formatTimestamp } from "./transcript";
import type { RankedVideo } from "../types";

export type ResearchPreview = {
  sampleQuestion: string;
  teaserAnswer: string;
  sourceVideo: {
    title: string;
    channel: string;
    url: string;
    timestamp: number;
    excerpt: string;
  };
  kbTeaser: {
    videoCount: number;
    estimatedChunks: number;
    sampleTopics: string[];
  };
};

export async function buildResearchPreview(
  topic: string,
  rankedVideos: RankedVideo[]
): Promise<ResearchPreview | null> {
  const topVideo = rankedVideos[0];
  if (!topVideo) return null;

  let excerpt = topVideo.whyRelevant;
  let timestamp = 0;

  try {
    const transcript = await getTranscript(topVideo.videoId);
    const segment = transcript.segments.find((item) => item.text.trim().length > 40);
    if (segment) {
      excerpt = segment.text.trim();
      timestamp = segment.start;
    }
  } catch {
    // Fall back to relevance summary when transcript is unavailable.
  }

  const sampleQuestion = `What should I know about ${topic}?`;
  const teaserAnswer = await generateText(
    "You preview a paid knowledge-base feature. Write 2 short sentences using only the excerpt. End with: Upgrade to Pro to ask follow-up questions with citations.",
    `Topic: ${topic}\nVideo: ${topVideo.title}\nTimestamp: ${formatTimestamp(timestamp)}\nExcerpt: ${excerpt}`,
    { maxTokens: 120 }
  ).catch(() =>
    `These videos discuss "${topic}" in depth — including ${topVideo.title}. Upgrade to Pro to ask follow-up questions with citations.`
  );

  return {
    sampleQuestion,
    teaserAnswer,
    sourceVideo: {
      title: topVideo.title,
      channel: topVideo.channel,
      url: topVideo.url,
      timestamp,
      excerpt,
    },
    kbTeaser: {
      videoCount: rankedVideos.length,
      estimatedChunks: rankedVideos.length * 12,
      sampleTopics: rankedVideos.slice(0, 3).map((video) => video.title),
    },
  };
}
