import { youtubeHttpFetch } from "./youtube-http";

const SUGGEST_TIMEOUT_MS = 3_000;

function parseSuggestPayload(text: string): string[] {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed) || !Array.isArray(parsed[1])) return [];

    const suggestions: string[] = [];
    for (const entry of parsed[1]) {
      if (!Array.isArray(entry) || typeof entry[0] !== "string") continue;
      const value = entry[0].trim();
      if (value) suggestions.push(value);
    }
    return suggestions;
  } catch {
    return [];
  }
}

/** Unofficial YouTube-oriented Google autocomplete (no API key). */
export async function fetchYoutubeSearchSuggestions(
  query: string,
  timeoutMs = SUGGEST_TIMEOUT_MS
): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const seeds = [trimmed, `${trimmed} `];
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const seed of seeds) {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(seed)}`;
    try {
      const res = await youtubeHttpFetch(url, {
        headers: { Accept: "application/json" },
        timeoutMs,
      });
      if (!res.ok) continue;
      const text = await res.text();
      for (const value of parseSuggestPayload(text)) {
        const key = value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        suggestions.push(value);
      }
    } catch {
      // Suggest is best-effort; paraphrases and fallbacks still fill the list.
    }
    if (suggestions.length >= 8) break;
  }

  return suggestions.slice(0, 8);
}
