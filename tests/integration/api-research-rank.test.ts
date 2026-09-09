import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/research/rank/route";
import { mockAnalysisPair } from "../fixtures/research";

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

import { requireUserId, AuthError } from "@/lib/auth";

describe("POST /api/research/rank", () => {
  beforeEach(() => {
    vi.mocked(requireUserId).mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new AuthError("Sign in required"));

    const req = new NextRequest("http://localhost/api/research/rank", {
      method: "POST",
      body: JSON.stringify({ topic: "test", queriesUsed: [], analyses: [] }),
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

    const analyses = [
      mockAnalysisPair({ videoId: "high" }, { relevanceScore: 85 }),
      mockAnalysisPair({ videoId: "low" }, { relevanceScore: 20, discussesTopic: false }),
    ];

    const req = new NextRequest("http://localhost/api/research/rank", {
      method: "POST",
      body: JSON.stringify({
        topic: "AI SaaS monetization",
        queriesUsed: ["AI SaaS revenue"],
        videosSearched: 10,
        analyses,
        maxVideos: 5,
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
