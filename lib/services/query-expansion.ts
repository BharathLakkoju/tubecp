import { generateText } from "./llm";
import { getCachedExpandedQueries, cacheExpandedQueries, hashTopic } from "../store";
import { CURRENT_YEAR, dedupeQueries } from "./research-scoring";

function buildSystemPrompt(maxQueries: number): string {
  const secondaryCount = Math.max(2, maxQueries - 1);
  const upper = Math.min(secondaryCount + 1, 7);

  return `You are a YouTube search assistant. Given a research topic, suggest ${secondaryCount}-${upper} SHORT search queries that would find the best YouTube videos — the same queries a human would type into YouTube.

Rules:
- Queries must sound like real YouTube searches or popular video titles (conversational, not blog SEO)
- Prefer "how I ..." / "solo developer ..." / "building X alone" style when the topic fits
- Keep each query under 12 words
- Do NOT add years unless the topic already contains a year
- Do NOT invent niche subtopics (architecture, case studies, pricing guides) unless the topic asks for them
- The user's exact topic is already searched separately — only add close variants
- Return ONLY a JSON array of strings`;
}

function topicTerms(topic: string): string {
  const base = topic.replace(/\b20\d{2}\b/g, "").trim();
  return base.replace(/^how (?:do i|to)\s+/i, "").trim() || base;
}

function fallbackQueries(topic: string): string[] {
  const terms = topicTerms(topic);

  return [
    `how I ${terms}`,
    `${terms} solo developer`,
    `building ${terms} alone`,
    `${terms} full tutorial`,
    `${terms} walkthrough`,
    `${terms} beginner guide`,
    `${terms} mistakes to avoid`,
    `${terms} case study`,
  ];
}

function finalizeQueries(topic: string, queries: string[], maxQueries: number): string[] {
  return dedupeQueries(topic, [...queries, ...fallbackQueries(topic)], maxQueries);
}

const EXPAND_CACHE_VERSION = "v3";

export async function expandQueries(
  topic: string,
  options?: { maxQueries?: number }
): Promise<string[]> {
  const maxQueries = options?.maxQueries ?? 5;
  const topicHash = hashTopic(
    `${EXPAND_CACHE_VERSION}:${maxQueries}:${topic.toLowerCase().trim()}`
  );
  const cached = await getCachedExpandedQueries(topicHash);
  if (cached?.length) return dedupeQueries(topic, cached, maxQueries);

  const response = await generateText(
    buildSystemPrompt(maxQueries),
    `Today's year: ${CURRENT_YEAR}\nResearch topic: "${topic}"`,
    { temperature: 0.1, maxTokens: 450 }
  );

  let queries: string[] = [];

  try {
    const match = response.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        queries = parsed.filter((q) => typeof q === "string" && q.trim());
      }
    }
  } catch {
    // fall through
  }

  const unique = finalizeQueries(topic, queries.length >= 2 ? queries : [], maxQueries);

  await cacheExpandedQueries(topicHash, unique);
  return unique;
}
