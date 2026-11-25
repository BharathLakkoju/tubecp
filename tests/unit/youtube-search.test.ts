import { describe, expect, it } from "vitest";
import { getResearchPipelineLimits } from "@/lib/research-limits";
import {
  searchYouTubeMultiple,
  type YoutubeSearchPageFn,
} from "@/lib/services/youtube-search";
import { mockVideo } from "../fixtures/research";

function videos(prefix: string, start: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const n = start + index;
    return mockVideo({
      videoId: `${prefix}-${n}`,
      title: `${prefix} ${n}`,
      url: `https://www.youtube.com/watch?v=${prefix}-${n}`,
    });
  });
}

function overlappingParaphraseSearch(): {
  searchPage: YoutubeSearchPageFn;
  calls: Array<{ query: string; pageToken?: string; maxResults?: number }>;
} {
  const calls: Array<{ query: string; pageToken?: string; maxResults?: number }> = [];
  const searchPage: YoutubeSearchPageFn = async (query, options) => {
    const max = options?.maxResults ?? 25;
    calls.push({
      query,
      pageToken: options?.pageToken,
      maxResults: options?.maxResults,
    });
    if (query === "AI SaaS monetization") {
      if (options?.pageToken === "p2") {
        return { videos: videos("deep", 1, max) };
      }
      return { videos: videos("top", 1, max), nextPageToken: "p2" };
    }
    return { videos: videos("top", 1, max) };
  };
  return { searchPage, calls };
}

describe("searchYouTubeMultiple", () => {
  it("stays near one primary page when paraphrases overlap and pagination is off", async () => {
    const { searchPage, calls } = overlappingParaphraseSearch();
    const result = await searchYouTubeMultiple(
      ["AI SaaS monetization", "AI SaaS strategy", "AI SaaS examples"],
      undefined,
      {
        primarySearchResults: 30,
        secondarySearchResults: 12,
        maxSecondaryQueries: 6,
        maxExpandedQueries: 8,
        targetUniqueResults: 60,
        maxPrimaryPages: 1,
      },
      undefined,
      { searchPage }
    );

    expect(result).toHaveLength(30);
    expect(calls.some((call) => call.pageToken === "p2")).toBe(false);
  });

  it("paginates the primary query until researcher unique videos reach 60", async () => {
    const { searchPage, calls } = overlappingParaphraseSearch();
    const limits = getResearchPipelineLimits("researcher").search;
    const result = await searchYouTubeMultiple(
      [
        "AI SaaS monetization",
        "AI SaaS strategy",
        "AI SaaS examples",
        "AI SaaS case study",
        "AI SaaS playbook",
      ],
      undefined,
      limits,
      undefined,
      { searchPage }
    );

    expect(result.length).toBeGreaterThanOrEqual(60);
    expect(result.length).toBeLessThanOrEqual(limits.targetUniqueResults + 12);
    expect(calls.some((call) => call.query === "AI SaaS monetization" && call.pageToken === "p2")).toBe(
      true
    );
  });

  it("does not spend a second primary page on pro", async () => {
    const { searchPage, calls } = overlappingParaphraseSearch();
    const limits = getResearchPipelineLimits("pro").search;
    await searchYouTubeMultiple(
      ["AI SaaS monetization", "AI SaaS strategy"],
      undefined,
      limits,
      undefined,
      { searchPage }
    );
    expect(calls.some((call) => call.pageToken === "p2")).toBe(false);
  });
});

describe("researcher search limits", () => {
  it("asks YouTube for a full primary page and a unique-video target of 60", () => {
    const limits = getResearchPipelineLimits("researcher");
    expect(limits.search.primarySearchResults).toBe(50);
    expect(limits.search.targetUniqueResults).toBe(60);
    expect(limits.search.maxPrimaryPages).toBe(2);
    expect(limits.maxResults).toBe(60);
  });
});
