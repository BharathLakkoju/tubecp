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

  const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseSuggestPayload(text).slice(0, 8);
  } catch {
    return [];
  }
}
