import { v4 as uuidv4 } from "uuid";
import { isE2eAuthBypass } from "@/lib/e2e";
import { createKnowledgeBase } from "@/lib/services/knowledge-base";
import { addToKbVectorIndex } from "@/lib/store/vector-index";
import {
  addUserKnowledgeBase,
  registerVideoChunks,
  saveChunk,
  updateKnowledgeBase,
} from "@/lib/store";
import type { ChatSource, RankedVideo, ResearchResult, VideoCandidate } from "@/lib/types";
import type { ChatStreamEvent } from "@/lib/services/chat";
import type { BuildKnowledgeBaseResult } from "@/lib/services/kb-build";

export function isE2eStubMode(): boolean {
  return (
    isE2eAuthBypass() &&
    (process.env.E2E_STUB_APIS === "true" ||
      process.env.OPENROUTER_API_KEY === "test-openrouter" ||
      process.env.YOUTUBE_API_KEY === "test-youtube")
  );
}

export function stubExpandedQueries(topic: string): string[] {
  return [topic, `${topic} tutorial`, `${topic} explained`];
}

export function stubResearchResult(topic: string): ResearchResult {
  const video: VideoCandidate = {
    videoId: "stub-video-1",
    title: `${topic} — E2E stub`,
    channel: "Stub Channel",
    url: "https://www.youtube.com/watch?v=stub-video-1",
    publishedAt: new Date().toISOString(),
  };

  return {
    topic,
    queriesUsed: stubExpandedQueries(topic),
    videosSearched: 1,
    allVideos: [
      {
        videoId: video.videoId,
        title: video.title,
        channel: video.channel,
        url: video.url,
        thumbnailUrl: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
      },
    ],
    rankedVideos: [
      {
        videoId: video.videoId,
        title: video.title,
        channel: video.channel,
        url: video.url,
        thumbnailUrl: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        relevanceScore: 88,
        whyRelevant: "E2E stub video for automated testing.",
        discussionLevel: "substantial",
      },
    ],
  };
}

export async function stubKnowledgeBaseBuild(
  topic: string,
  rankedVideos: RankedVideo[],
  userId: string,
  persistent = false
): Promise<BuildKnowledgeBaseResult> {
  const kb = await createKnowledgeBase(topic, rankedVideos, userId, persistent);
  await addUserKnowledgeBase(userId, kb.kbId);

  const video = rankedVideos[0];
  const chunkId = uuidv4();
  const embedding = Array.from({ length: 16 }, (_, index) => (index === 0 ? 1 : 0));
  const chunk = {
    id: chunkId,
    videoId: video.videoId,
    title: video.title,
    channel: video.channel,
    timestamp: 42,
    text: `E2E stub transcript excerpt about ${topic}.`,
    embedding,
  };

  await saveChunk(chunk);
  await registerVideoChunks(video.videoId, [chunkId]);
  await addToKbVectorIndex(kb.kbId, [{ id: chunkId, embedding }]);

  const ready = await updateKnowledgeBase(
    kb.kbId,
    (current) => ({
      ...current,
      chunkIds: [chunkId],
      chunksIndexed: 1,
      videosIndexed: 1,
      totalMinutes: 5,
      status: "ready",
      buildJob: {
        totalVideos: rankedVideos.length,
        processedVideos: rankedVideos.length,
        skippedCount: 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),
    persistent
  );

  if (!ready) {
    throw new Error("Failed to finalize E2E stub knowledge base");
  }

  return { kb: ready, skippedVideos: [] };
}

export async function* streamStubKnowledgeBaseChat(
  kbId: string,
  message: string
): AsyncGenerator<ChatStreamEvent> {
  const kb = await import("@/lib/store").then((m) => m.getKnowledgeBase(kbId));
  const topic = kb?.topic ?? "this topic";

  yield { type: "status", message: "Exploring your question..." };

  const answer = `E2E stub: "${message}" is answered using indexed content about ${topic}.`;
  yield { type: "token", text: answer };

  const sources: ChatSource[] = [
    {
      videoId: "stub-video-1",
      title: `${topic} — E2E stub`,
      timestamp: 42,
      url: "https://www.youtube.com/watch?v=stub-video-1&t=42",
      excerpt: `E2E stub transcript excerpt about ${topic}.`,
    },
  ];

  yield { type: "done", sources };
}
