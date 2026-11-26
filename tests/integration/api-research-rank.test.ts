import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/research/rank/route";
import { mockVideo } from "../fixtures/research";
import type { VideoState } from "@/lib/services/selection";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    requireUserId: vi.fn(),
  };
});

vi.mock("@/lib/ratelimit", () => ({
  rateLimitApi: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/billing/subscription", () => ({
  getUserSubscription: vi.fn().mockResolvedValue({ plan: "free" }),
}));

vi.mock("@/lib/research-session", () => ({
  assertResearchSession: vi.fn().mockResolvedValue(undefined),
  getResearchCheckpoint: vi.fn().mockResolvedValue(null),
  saveResearchCheckpoint: vi.fn().mockResolvedValue(undefined),
}));

import { requireUserId, AuthError } from "@/lib/auth";

describe("POST /api/research/rank", () => {
  beforeEach(() => {
    vi.mocked(requireUserId).mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new AuthError("Sign in required"));

    const req = new NextRequest("http://localhost/api/research/rank", {
      method: "POST",
      body: JSON.stringify({ topic: "test", queriesUsed: [], states: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields missing", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");

    const req = new NextRequest("http://localhost/api/research/rank", {
      method: "POST",
      body: JSON.stringify({ topic: "AI SaaS" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("ranks videos for authenticated requests", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");

    const states: VideoState[] = [
      {
        state: "selected",
        video: {
          videoId: "high",
          title: mockVideo().title,
          channel: mockVideo().channel,
          url: mockVideo().url,
          thumbnailUrl: "",
        },
        discussion: "substantial",
        why: "The transcript covers pricing.",
        evidence: [{ timestamp: 12, text: "We charge $49", relevance: 80 }],
      },
      {
        state: "rejected",
        video: {
          videoId: "low",
          title: "Other",
          channel: "c",
          url: "https://www.youtube.com/watch?v=low",
          thumbnailUrl: "",
        },
        reason: "off_topic",
        why: "The transcript is about something else.",
      },
    ];

    const req = new NextRequest("http://localhost/api/research/rank", {
      method: "POST",
      body: JSON.stringify({
        topic: "AI SaaS monetization",
        queriesUsed: ["AI SaaS revenue"],
        videosSearched: 10,
        states,
        researchSessionId: "session_test",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rankedVideos).toHaveLength(1);
    expect(body.rankedVideos[0].videoId).toBe("high");
    expect(body.topic).toBe("AI SaaS monetization");
  });
});
