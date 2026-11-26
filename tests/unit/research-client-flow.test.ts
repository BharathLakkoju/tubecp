import { beforeEach, describe, expect, it, vi } from "vitest";
import { runResearch } from "@/lib/client/workflows";

describe("runResearch", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses expand → search → analyze instead of the 60s monolith stream", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (url.includes("/api/research/expand")) {
        return new Response(
          JSON.stringify({
            queries: ["topic", "topic strategy"],
            researchSessionId: "sess-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/api/research/search")) {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                videoId: "v1",
                title: "Talk",
                channel: "Ch",
                url: "https://youtu.be/v1",
                publishedAt: "",
              },
            ],
            allCandidates: [
              {
                videoId: "v1",
                title: "Talk",
                channel: "Ch",
                url: "https://youtu.be/v1",
                publishedAt: "",
              },
            ],
            videosSearched: 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/api/research/analyze")) {
        return new Response(
          JSON.stringify({
            state: {
              state: "selected",
              video: body.video,
              discussion: "brief",
              why: "The transcript covers the topic.",
              evidence: [{ timestamp: 4, text: "Here is the point", relevance: 70 }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/api/research/rank")) {
        return new Response(
          JSON.stringify({
            topic: "topic",
            queriesUsed: ["topic"],
            videosSearched: 1,
            allVideos: [],
            rankedVideos: [
              {
                videoId: "v1",
                title: "Talk",
                channel: "Ch",
                url: "https://youtu.be/v1",
                relevanceScore: 80,
                whyRelevant: "Relevant",
                discussionLevel: "brief",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { research, researchSessionId } = await runResearch("topic");
    expect(researchSessionId).toBe("sess-1");
    expect(research.rankedVideos).toHaveLength(1);
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.endsWith("/api/research"))).toBe(false);
    expect(urls.some((url) => url.includes("/api/research/expand"))).toBe(true);
    expect(urls.some((url) => url.includes("/api/research/analyze"))).toBe(true);
    const rankCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes("/api/research/rank")
    );
    const rankBody = JSON.parse(String(rankCall?.[1]?.body));
    expect(rankBody.states[0].state).toBe("selected");
    expect(rankBody.analyses).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
