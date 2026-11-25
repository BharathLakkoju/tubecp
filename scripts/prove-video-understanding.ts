/**
 * Prints the clickbait-vs-coverage scoring gap the old blend hid.
 *
 *   npx tsx scripts/prove-video-understanding.ts
 */
import {
  METADATA_FALLBACK_CAP,
  UNDERSTANDING_RANK_MIN,
  legacyBlendScore,
  scoreFromUnderstanding,
} from "../lib/services/video-understanding";

const clickbait = {
  llmScore: 20,
  transcriptScore: 18,
  metadataScore: 92,
  coverage: "mentioned" as const,
  evidenceCount: 0,
  searchPrior: 28,
};

const deepCoverage = {
  llmScore: 82,
  transcriptScore: 78,
  metadataScore: 25,
  coverage: "substantial" as const,
  evidenceCount: 3,
  searchPrior: 4,
};

const titleOnly = {
  llmScore: 90,
  transcriptScore: 0,
  metadataScore: 95,
  coverage: "substantial" as const,
  evidenceCount: 0,
  searchPrior: 29,
};

const rows = [
  {
    case: "clickbait title, off-topic transcript",
    legacy: legacyBlendScore(
      clickbait.llmScore,
      clickbait.transcriptScore,
      clickbait.metadataScore,
      clickbait.coverage,
      clickbait.searchPrior
    ),
    understanding: scoreFromUnderstanding({ source: "transcript", ...clickbait }),
  },
  {
    case: "weak title, transcript covers the topic",
    legacy: legacyBlendScore(
      deepCoverage.llmScore,
      deepCoverage.transcriptScore,
      deepCoverage.metadataScore,
      deepCoverage.coverage,
      deepCoverage.searchPrior
    ),
    understanding: scoreFromUnderstanding({ source: "transcript", ...deepCoverage }),
  },
  {
    case: "no transcript, title matches",
    legacy: legacyBlendScore(
      titleOnly.llmScore,
      titleOnly.transcriptScore,
      titleOnly.metadataScore,
      titleOnly.coverage,
      titleOnly.searchPrior
    ),
    understanding: scoreFromUnderstanding({ source: "metadata_fallback", ...titleOnly }),
  },
];

const clickbaitRow = rows[0];
const deepRow = rows[1];
const fallbackRow = rows[2];

const ok =
  clickbaitRow.legacy >= UNDERSTANDING_RANK_MIN &&
  clickbaitRow.understanding < UNDERSTANDING_RANK_MIN &&
  deepRow.understanding > clickbaitRow.understanding &&
  fallbackRow.understanding <= METADATA_FALLBACK_CAP;

console.log(
  JSON.stringify(
    {
      ok,
      rankMin: UNDERSTANDING_RANK_MIN,
      fallbackCap: METADATA_FALLBACK_CAP,
      rows,
    },
    null,
    2
  )
);

if (!ok) process.exit(1);
