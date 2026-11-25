import { describe, expect, it } from "vitest";
import { fallbackQueries } from "@/lib/services/query-expansion";
import { classifyPipelineError, isTerminalErrorClass } from "@/lib/pipeline/errors";
import { TranscriptUnavailableError } from "@/lib/services/transcript";
import { parseHostedTranscriptPayload } from "@/lib/services/hosted-transcript";
import { rankVideos } from "@/lib/services/relevance";
import { buildMetadataOnlyAnalysis } from "@/lib/services/metadata-analysis";
import { getResearchPipelineLimits } from "@/lib/research-limits";
import {
  searchYouTubeMultiple,
  type YoutubeSearchPageFn,
} from "@/lib/services/youtube-search";
import {
  METADATA_FALLBACK_CAP,
  UNDERSTANDING_RANK_MIN,
  legacyBlendScore,
  scoreFromUnderstanding,
  shouldRankFromUnderstanding,
} from "@/lib/services/video-understanding";
import type { VideoCandidate, VideoAnalysis } from "@/lib/types";

function oldTranscriptKind(detail: string): "permanent" | "transient" {
  if (
    /too many requests|captcha|429|rate.?limit|sign in to confirm|not a bot|blocked|timeout|timed out|aborted|ECONNRESET|ETIMEDOUT|503|502|playability.*LOGIN_REQUIRED/i.test(
      detail
    )
  ) {
    return "transient";
  }
  if (
    /disabled on this video|transcripts are disabled|no transcript is available|no transcripts are available/i.test(
      detail
    )
  ) {
    return "permanent";
  }
  return "transient";
}

function video(partial: Partial<VideoCandidate> & { videoId: string; title: string }): VideoCandidate {
  return {
    channel: "Ch",
    url: `https://www.youtube.com/watch?v=${partial.videoId}`,
    publishedAt: "",
    ...partial,
  };
}

describe("prove YouTube research changes preserve old contracts", () => {
  it("keeps learn and compare fallbacks identical to master", () => {
    expect(fallbackQueries("how do i ship a saas solo")).toEqual([
      "how to ship a saas solo",
      "ship a saas solo tutorial",
      "ship a saas solo walkthrough",
    ]);
    expect(fallbackQueries("best budget espresso machine")).toEqual([
      "best budget espresso machine review",
      "best budget espresso machine vs",
      "best budget espresso machine comparison",
    ]);
  });

  it("still treats disabled captions as terminal no_captions", () => {
    const err = new TranscriptUnavailableError("abc", new Error("Transcript is disabled on this video"));
    expect(err.kind).toBe("permanent");
    expect(classifyPipelineError(err)).toBe("no_captions");
    expect(isTerminalErrorClass("no_captions")).toBe(true);
  });

  it("still ranks in-topic videos and drops off-topic ones", () => {
    const ranked = rankVideos(
      "AI SaaS",
      ["AI SaaS"],
      2,
      [
        {
          video: video({ videoId: "keep", title: "AI SaaS monetization", searchRank: 1, searchScore: 28 }),
          analysis: {
            videoId: "keep",
            relevanceScore: 80,
            discussesTopic: true,
            summary: "Covers the topic",
            discussionLevel: "substantial",
            evidence: [],
            semanticScore: 70,
            metadataScore: 70,
          } satisfies VideoAnalysis,
        },
        {
          video: video({ videoId: "drop", title: "Unrelated cooking", searchRank: 40, searchScore: 1 }),
          analysis: {
            videoId: "drop",
            relevanceScore: 10,
            discussesTopic: false,
            summary: "No",
            discussionLevel: "mentioned",
            evidence: [],
            semanticScore: 5,
            metadataScore: 5,
          } satisfies VideoAnalysis,
        },
      ],
      15
    );
    expect(ranked.rankedVideos.map((item) => item.videoId)).toEqual(["keep"]);
    expect(ranked.rankedVideos[0]).toMatchObject({
      relevanceScore: 80,
      whyRelevant: "Covers the topic",
      discussionLevel: "substantial",
    });
    expect(ranked.allVideos).toHaveLength(2);
  });

  it("keeps free and pro search/analyze caps identical to the shipped plans", () => {
    const free = getResearchPipelineLimits("free");
    const pro = getResearchPipelineLimits("pro");
    expect(free.maxResults).toBe(15);
    expect(free.analyzeLimit).toBe(28);
    expect(free.search.maxPrimaryPages).toBe(1);
    expect(pro.maxResults).toBe(40);
    expect(pro.search.primarySearchResults).toBe(25);
    expect(pro.search.maxPrimaryPages).toBe(1);
  });

  it("still scores a title match when the transcript is missing", () => {
    const analysis = buildMetadataOnlyAnalysis(
      video({
        videoId: "meta",
        title: "AI SaaS monetization pricing and MRR growth",
        description: "How to price AI SaaS products and grow revenue.",
        searchRank: 3,
        searchScore: 22,
      }),
      "AI SaaS monetization"
    );
    expect(analysis.relevanceScore).toBeGreaterThan(0);
    expect(analysis.discussesTopic).toBe(true);
    expect(analysis.relevanceScore).toBeLessThanOrEqual(METADATA_FALLBACK_CAP);
  });

  it("still ranks a 35-37 video that discusses the topic with spoken coverage", () => {
    expect(
      shouldRankFromUnderstanding({
        relevanceScore: 36,
        discussesTopic: true,
        discussionLevel: "brief",
        semanticScore: 52,
        evidence: [{ timestamp: 10, text: "pricing", relevance: 70 }],
        scoreSource: "transcript",
      })
    ).toBe(true);
  });
});

describe("prove YouTube research changes only improve the broken paths", () => {
  it("expands generic topics that previously returned []", () => {
    const queries = fallbackQueries("AI SaaS monetization");
    expect(queries.length).toBeGreaterThan(0);
    expect(queries.some((query) => query.includes("strategy"))).toBe(true);
  });

  it("retries scrape-empty instead of skipping as no_captions", () => {
    const detail = "No transcripts are available for this video";
    expect(oldTranscriptKind(detail)).toBe("permanent");
    const err = new TranscriptUnavailableError("abc", new Error(detail));
    expect(err.kind).toBe("transient");
    expect(classifyPipelineError(err)).not.toBe("no_captions");
  });

  it("classifies blocked-but-tracks-exist as retryable blocked", () => {
    const err = new TranscriptUnavailableError(
      "abc",
      new Error("Caption tracks exist but YouTube blocked automated access — retrying")
    );
    expect(err.kind).toBe("transient");
    expect(classifyPipelineError(err)).toBe("blocked");
    expect(isTerminalErrorClass("blocked")).toBe(false);
  });

  it("parses a hosted transcript API payload", () => {
    const segments = parseHostedTranscriptPayload({
      lang: "en",
      content: [{ text: "Hello", offset: 0, duration: 1200 }],
    });
    expect(segments[0]?.text).toBe("Hello");
  });

  it("drops clickbait titles that the old blend ranked", () => {
    const clickbait = {
      llmScore: 20,
      transcriptScore: 18,
      metadataScore: 92,
      coverage: "mentioned" as const,
      searchPrior: 28,
    };
    const legacy = legacyBlendScore(
      clickbait.llmScore,
      clickbait.transcriptScore,
      clickbait.metadataScore,
      clickbait.coverage,
      clickbait.searchPrior
    );
    const understanding = scoreFromUnderstanding({ source: "transcript", ...clickbait, evidenceCount: 0 });
    expect(legacy).toBeGreaterThanOrEqual(UNDERSTANDING_RANK_MIN);
    expect(understanding).toBeLessThan(UNDERSTANDING_RANK_MIN);
  });

  it("paginates researcher search to 60 unique videos without changing pro to a second page", async () => {
    const fakeVideos = (prefix: string, count: number) =>
      Array.from({ length: count }, (_, index) =>
        video({ videoId: `${prefix}-${index + 1}`, title: `${prefix} ${index + 1}` })
      );
    const overlappingSearch: YoutubeSearchPageFn = async (query, options) => {
      const max = options?.maxResults ?? 25;
      if (query === "AI SaaS monetization" && options?.pageToken === "p2") {
        return { videos: fakeVideos("deep", max) };
      }
      if (query === "AI SaaS monetization") {
        return { videos: fakeVideos("top", max), nextPageToken: "p2" };
      }
      return { videos: fakeVideos("top", max) };
    };

    const researcherHits = await searchYouTubeMultiple(
      ["AI SaaS monetization", "AI SaaS strategy", "AI SaaS examples"],
      undefined,
      getResearchPipelineLimits("researcher").search,
      undefined,
      { searchPage: overlappingSearch }
    );
    const proHits = await searchYouTubeMultiple(
      ["AI SaaS monetization", "AI SaaS strategy"],
      undefined,
      getResearchPipelineLimits("pro").search,
      undefined,
      { searchPage: overlappingSearch }
    );

    expect(researcherHits.length).toBeGreaterThanOrEqual(60);
    expect(proHits.length).toBeLessThanOrEqual(25);
  });

  it("parses TRANSCRIPT_API_BASE youtube_transcript_api JSON", () => {
    const segments = parseHostedTranscriptPayload({
      success: true,
      transcript: [{ text: "Never gonna give you up", start: 43, duration: 2.12 }],
      metadata: { default_audio_language: "en" },
    });
    expect(segments[0]).toMatchObject({ text: "Never gonna give you up", offset: 43, duration: 2.12 });
  });
});
