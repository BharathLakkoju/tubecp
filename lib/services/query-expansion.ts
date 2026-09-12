import { generateText } from "./llm";
import { getCachedExpandedQueries, cacheExpandedQueries, hashTopic } from "../store";
import { CURRENT_YEAR, dedupeQueries } from "./research-scoring";

const SYSTEM_PROMPT = `You are a YouTube search assistant. Given a research topic, suggest 3-4 SHORT search queries that would find the best YouTube videos — the same queries a human would type into YouTube.

Rules:
- Queries must sound like real YouTube searches or popular video titles (conversational, not blog SEO)
- Prefer "how I ..." / "solo developer ..." / "building X alone" style when the topic fits
- Keep each query under 12 words
- Do NOT add years unless the topic already contains a year
- Do NOT invent niche subtopics (architecture, case studies, pricing guides) unless the topic asks for them
- The user's exact topic is already searched separately — only add close variants
- Return ONLY a JSON array of strings`;

function deterministicFallbacks(topic: string): string[] {
  const base = topic.replace(/\b20\d{2}\b/g, "").trim();
  const terms = base.replace(/^how (?:do i|to)\s+/i, "").trim() || base;

  return dedupeQueries(
    topic,
    [
      `how I ${terms}`,
      `${terms} solo developer`,
      `building ${terms} alone`,
      `${terms} full tutorial`,
    ],
    5
  );
}

const EXPAND_CACHE_VERSION = "v2";

export async function expandQueries(topic: string): Promise<string[]> {
  const topicHash = hashTopic(`${EXPAND_CACHE_VERSION}:${topic.toLowerCase().trim()}`);
  const cached = await getCachedExpandedQueries(topicHash);
  if (cached?.length) return dedupeQueries(topic, cached);

  const response = await generateText(
    SYSTEM_PROMPT,
    `Today's year: ${CURRENT_YEAR}\nResearch topic: "${topic}"`,
    { temperature: 0.1, maxTokens: 350 }
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

  const unique = queries.length >= 2 ? dedupeQueries(topic, queries) : deterministicFallbacks(topic);

  await cacheExpandedQueries(topicHash, unique);
  return unique;
}
