import { generateText } from "./llm";
import { getCachedExpandedQueries, cacheExpandedQueries, hashTopic } from "../store";

const SYSTEM_PROMPT = `You are a YouTube research query expansion assistant.

Given a research topic, output 6-8 diverse search queries that find videos where the topic is DISCUSSED in depth — not just mentioned in the title.

Rules:
- Include queries with different angles (how-to, case study, mistakes, pricing, architecture, etc.)
- Include year-specific queries when the topic mentions a year
- Avoid overly broad queries that return generic news or motivational content
- Return ONLY a JSON array of strings`;

function deterministicFallbacks(topic: string): string[] {
  const yearMatch = topic.match(/\b(20\d{2})\b/);
  const year = yearMatch?.[1] ?? "2026";
  const base = topic.replace(/\b20\d{2}\b/g, "").trim();

  return [
    topic,
    `${base} case study`,
    `${base} revenue pricing`,
    `${base} deep dive`,
    `how to ${base}`,
    `${base} real examples ${year}`,
    `${base} founder interview`,
    `${base} mistakes lessons`,
  ];
}

export async function expandQueries(topic: string): Promise<string[]> {
  const topicHash = hashTopic(topic.toLowerCase().trim());
  const cached = await getCachedExpandedQueries(topicHash);
  if (cached?.length) return cached;

  const response = await generateText(SYSTEM_PROMPT, `Research topic: "${topic}"`, {
    temperature: 0.15,
    maxTokens: 500,
  });

  let queries: string[] = [];

  try {
    const match = response.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        queries = [topic, ...parsed.filter((q) => typeof q === "string" && q.trim())];
      }
    }
  } catch {
    // fall through
  }

  if (queries.length < 4) {
    queries = deterministicFallbacks(topic);
  }

  const unique = [...new Set(queries.map((q) => q.trim()).filter(Boolean))];
  await cacheExpandedQueries(topicHash, unique);
  return unique;
}
