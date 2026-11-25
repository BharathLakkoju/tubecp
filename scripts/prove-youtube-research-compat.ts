/**
 * Live compatibility proof for YouTube research/transcript changes.
 * Compares current module output to the contracts on master, then prints
 * the observed values. Exit 1 if a preserved contract regresses.
 *
 *   npx tsx scripts/prove-youtube-research-compat.ts
 */
import { fallbackQueries } from "../lib/services/query-expansion";
import { classifyPipelineError, isTerminalErrorClass } from "../lib/pipeline/errors";
import { TranscriptUnavailableError } from "../lib/services/transcript";
import {
  parseHostedTranscriptPayload,
  videoTranscriptApiUrl,
  fetchHostedTranscript,
} from "../lib/services/hosted-transcript";
import { rankVideos } from "../lib/services/relevance";
import type { VideoCandidate, VideoAnalysis } from "../lib/types";

type Row = {
  contract: string;
  preserved?: boolean;
  improved?: boolean;
  observed: unknown;
  expected?: unknown;
};

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

const rows: Row[] = [];
let failed = false;

function preserve(contract: string, observed: unknown, expected: unknown) {
  const ok = JSON.stringify(observed) === JSON.stringify(expected);
  rows.push({ contract, preserved: ok, observed, expected });
  if (!ok) failed = true;
}

function improve(contract: string, observed: unknown, betterThan: unknown) {
  const ok = JSON.stringify(observed) !== JSON.stringify(betterThan);
  rows.push({ contract, improved: ok, observed, expected: { not: betterThan } });
  if (!ok) failed = true;
}

preserve(
  "learn fallbacks stay how-to/tutorial/walkthrough",
  fallbackQueries("how do i ship a saas solo"),
  ["how to ship a saas solo", "ship a saas solo tutorial", "ship a saas solo walkthrough"]
);

preserve(
  "compare fallbacks stay review/vs/comparison",
  fallbackQueries("best budget espresso machine"),
  [
    "best budget espresso machine review",
    "best budget espresso machine vs",
    "best budget espresso machine comparison",
  ]
);

improve(
  "generic topics now expand instead of returning []",
  fallbackQueries("AI SaaS monetization"),
  []
);

const disabled = new TranscriptUnavailableError(
  "abc",
  new Error("Transcript is disabled on this video")
);
preserve("disabled captions are still permanent", disabled.kind, "permanent");
preserve(
  "disabled captions still map to terminal no_captions",
  classifyPipelineError(disabled),
  "no_captions"
);
preserve("no_captions is still terminal", isTerminalErrorClass("no_captions"), true);

const scrapeEmpty = new TranscriptUnavailableError(
  "abc",
  new Error("No transcripts are available for this video")
);
preserve("old classifier treated scrape-empty as permanent", oldTranscriptKind(scrapeEmpty.detail), "permanent");
improve("new classifier treats scrape-empty as retryable", scrapeEmpty.kind, "permanent");
preserve("scrape-empty is not terminal no_captions", classifyPipelineError(scrapeEmpty) === "no_captions", false);

const blockedTracks = new TranscriptUnavailableError(
  "abc",
  new Error("Caption tracks exist but YouTube blocked automated access — retrying")
);
preserve("tracks-exist-but-blocked is retryable", blockedTracks.kind, "transient");
preserve("tracks-exist-but-blocked classifies as blocked", classifyPipelineError(blockedTracks), "blocked");
preserve("blocked is not terminal", isTerminalErrorClass("blocked"), false);

const hosted = parseHostedTranscriptPayload({
  lang: "en",
  content: [{ text: "Hello", offset: 0, duration: 1200 }],
});
preserve("hosted transcript parser reads content[]", hosted[0]?.text, "Hello");

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
preserve("rank still keeps high-relevance videos", ranked.rankedVideos.map((v) => v.videoId), ["keep"]);
preserve("rank still drops off-topic videos", ranked.rankedVideos.some((v) => v.videoId === "drop"), false);

const pymastersUrl = videoTranscriptApiUrl(
  "https://get-transcript-back-pymasters-production.up.railway.app",
  "dQw4w9WgXcQ"
);
preserve(
  "TRANSCRIPT_API_BASE maps to GET /api/video/transcript",
  pymastersUrl,
  "https://get-transcript-back-pymasters-production.up.railway.app/api/video/transcript?videoId=dQw4w9WgXcQ&format=json&includeTimestamps=true"
);

async function proveLiveHostedApi() {
  process.env.TRANSCRIPT_API_BASE ??=
    "https://get-transcript-back-pymasters-production.up.railway.app";
  try {
    const live = await fetchHostedTranscript("dQw4w9WgXcQ");
    preserve(
      "TRANSCRIPT_API_BASE returns timed transcript segments",
      Boolean(live && live.length > 10 && live.some((seg) => /never gonna/i.test(seg.text))),
      true
    );
    rows.push({
      contract: "live hosted segment count",
      observed: live?.length ?? 0,
    });
  } catch (err) {
    failed = true;
    rows.push({
      contract: "TRANSCRIPT_API_BASE returns timed transcript segments",
      improved: false,
      observed: err instanceof Error ? err.message : String(err),
    });
  }
}

void proveLiveHostedApi().then(() => {
  console.log(JSON.stringify({ ok: !failed, rows }, null, 2));
  if (failed) process.exit(1);
});
