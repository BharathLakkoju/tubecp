import type { VideoAnalysis, VideoCandidate } from "@/lib/types";

export function mockVideo(overrides: Partial<VideoCandidate> = {}): VideoCandidate {
  return {
    videoId: "vid123",
    title: "How to monetize AI SaaS in 2026",
    channel: "SaaS Founder",
    url: "https://www.youtube.com/watch?v=vid123",
    publishedAt: "2026-01-01T00:00:00Z",
    description: "Deep dive on AI SaaS pricing, MRR, and revenue models.",
    ...overrides,
  };
}

export function mockAnalysis(overrides: Partial<VideoAnalysis> = {}): VideoAnalysis {
  return {
    videoId: "vid123",
    relevanceScore: 75,
    llmScore: 70,
    semanticScore: 80,
    metadataScore: 65,
    discussesTopic: true,
    summary: "Covers AI SaaS monetization with pricing examples.",
    discussionLevel: "substantial",
    evidence: [{ timestamp: 120, text: "We charge $49/mo for our AI SaaS", relevance: 85 }],
    ...overrides,
  };
}

export function mockAnalysisPair(
  video: Partial<VideoCandidate>,
  analysis: Partial<VideoAnalysis>
) {
  const v = mockVideo(video);
  return {
    video: v,
    analysis: mockAnalysis({ videoId: v.videoId, ...analysis }),
  };
}
