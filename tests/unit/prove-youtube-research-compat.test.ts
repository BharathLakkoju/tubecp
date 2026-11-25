import { describe, expect, it } from "vitest";
import { fallbackQueries } from "@/lib/services/query-expansion";
import { classifyPipelineError, isTerminalErrorClass } from "@/lib/pipeline/errors";
import { TranscriptUnavailableError } from "@/lib/services/transcript";
import { parseHostedTranscriptPayload } from "@/lib/services/hosted-transcript";
import { rankVideos } from "@/lib/services/relevance";
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
});
