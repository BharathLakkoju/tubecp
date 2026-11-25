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
import { buildMetadataOnlyAnalysis } from "../lib/services/metadata-analysis";
import { getResearchPipelineLimits } from "../lib/research-limits";
import {
  searchYouTubeMultiple,
  type YoutubeSearchPageFn,
} from "../lib/services/youtube-search";
import {
  METADATA_FALLBACK_CAP,
  UNDERSTANDING_RANK_MIN,
  legacyBlendScore,
  scoreFromUnderstanding,
  shouldRankFromUnderstanding,
} from "../lib/services/video-understanding";
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
preserve("ranked video still has relevanceScore", typeof ranked.rankedVideos[0]?.relevanceScore, "number");
preserve("ranked video still has whyRelevant", typeof ranked.rankedVideos[0]?.whyRelevant, "string");
preserve(
  "ranked discussionLevel stays brief or substantial",
  ranked.rankedVideos[0]?.discussionLevel === "brief" ||
    ranked.rankedVideos[0]?.discussionLevel === "substantial",
  true
);
preserve("allVideos still includes scraped candidates not just ranked", ranked.allVideos.length, 2);
preserve(
  "35-37 spoken coverage still ranks",
  shouldRankFromUnderstanding({
    relevanceScore: 36,
    discussesTopic: true,
    discussionLevel: "brief",
    semanticScore: 50,
    evidence: [{ timestamp: 12, text: "pricing" }],
    scoreSource: "transcript",
  }),
  true
);
preserve(
  "35-37 high semantic coverage still ranks",
  shouldRankFromUnderstanding({
    relevanceScore: 36,
    discussesTopic: false,
    discussionLevel: "brief",
    semanticScore: 72,
    evidence: [],
    scoreSource: "transcript",
  }),
  true
);
preserve(
  "search rank without understanding still cannot rank",
  shouldRankFromUnderstanding({
    relevanceScore: 36,
    discussesTopic: false,
    discussionLevel: "mentioned",
    semanticScore: 18,
    evidence: [],
    scoreSource: "transcript",
  }),
  false
);

const freeLimits = getResearchPipelineLimits("free");
const proLimits = getResearchPipelineLimits("pro");
preserve("free maxResults stays 15", freeLimits.maxResults, 15);
preserve("free analyzeLimit stays 28", freeLimits.analyzeLimit, 28);
preserve("pro maxResults stays 40", proLimits.maxResults, 40);
preserve("pro primary search stays 25", proLimits.search.primarySearchResults, 25);
preserve("pro still uses one primary YouTube page", proLimits.search.maxPrimaryPages, 1);
preserve("free still uses one primary YouTube page", freeLimits.search.maxPrimaryPages, 1);

const titleMatch = buildMetadataOnlyAnalysis(
  video({
    videoId: "meta",
    title: "AI SaaS monetization pricing and MRR growth",
    description: "How to price AI SaaS products and grow revenue.",
    searchRank: 3,
    searchScore: 22,
  }),
  "AI SaaS monetization"
);
preserve("title-only fallback still scores above zero", titleMatch.relevanceScore > 0, true);
preserve("title-only fallback still marks discussesTopic", titleMatch.discussesTopic, true);
rows.push({
  contract: "title-only fallback observed score",
  observed: titleMatch.relevanceScore,
});
preserve(
  "title-only fallback cannot look like a deep transcript watch",
  titleMatch.relevanceScore <= METADATA_FALLBACK_CAP,
  true
);
preserve(
  "analyze payload still has core fields",
  ["videoId", "relevanceScore", "discussesTopic", "summary", "discussionLevel", "evidence"].every(
    (key) => key in titleMatch
  ),
  true
);

const clickbait = {
  llmScore: 20,
  transcriptScore: 18,
  metadataScore: 92,
  coverage: "mentioned" as const,
  evidenceCount: 0,
  searchPrior: 28,
};
const deep = {
  llmScore: 82,
  transcriptScore: 78,
  metadataScore: 25,
  coverage: "substantial" as const,
  evidenceCount: 3,
  searchPrior: 4,
};
const legacyClickbait = legacyBlendScore(
  clickbait.llmScore,
  clickbait.transcriptScore,
  clickbait.metadataScore,
  clickbait.coverage,
  clickbait.searchPrior
);
const understandingClickbait = scoreFromUnderstanding({ source: "transcript", ...clickbait });
const understandingDeep = scoreFromUnderstanding({ source: "transcript", ...deep });
preserve(
  "legacy blend ranked clickbait title with off-topic transcript",
  legacyClickbait >= UNDERSTANDING_RANK_MIN,
  true
);
improve(
  "understanding score drops clickbait below the rank gate",
  understandingClickbait < UNDERSTANDING_RANK_MIN,
  false
);
improve(
  "spoken coverage outranks clickbait title",
  understandingDeep > understandingClickbait,
  false
);

function fakeVideos(prefix: string, count: number): VideoCandidate[] {
  return Array.from({ length: count }, (_, index) =>
    video({
      videoId: `${prefix}-${index + 1}`,
      title: `${prefix} ${index + 1}`,
    })
  );
}

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

async function proveUniqueSearchByPlan() {
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
  const freeHits = await searchYouTubeMultiple(
    ["AI SaaS monetization", "AI SaaS strategy"],
    undefined,
    getResearchPipelineLimits("free").search,
    undefined,
    { searchPage: overlappingSearch }
  );
  improve(
    "researcher unique search reaches 60 when paraphrases overlap",
    researcherHits.length >= 60,
    false
  );
  preserve("pro unique search stays on one primary page under overlap", proHits.length <= 25, true);
  preserve("free unique search stays on one primary page under overlap", freeHits.length <= 20, true);
  rows.push({
    contract: "unique search counts by plan under paraphrase overlap",
    observed: {
      free: freeHits.length,
      pro: proHits.length,
      researcher: researcherHits.length,
    },
  });
}

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

void proveUniqueSearchByPlan()
  .then(() => proveLiveHostedApi())
  .then(() => {
    console.log(JSON.stringify({ ok: !failed, rows }, null, 2));
    if (failed) process.exit(1);
  });
