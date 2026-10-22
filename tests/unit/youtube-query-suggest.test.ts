import { describe, expect, it, vi } from "vitest";
import { fetchYoutubeSearchSuggestions } from "@/lib/services/youtube-query-suggest";

describe("fetchYoutubeSearchSuggestions", () => {
  it("parses firefox-style autocomplete JSON", async () => {
    const payload = JSON.stringify([
      "react tutorial",
      [["react tutorial 2026", 0], ["react tutorial for beginners", 0]],
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(payload, { status: 200 }))
    );

    const suggestions = await fetchYoutubeSearchSuggestions("react tutorial", 1000);
    expect(suggestions).toEqual(["react tutorial 2026", "react tutorial for beginners"]);

    vi.unstubAllGlobals();
  });
});
