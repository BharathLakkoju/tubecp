import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/youtube-query-suggest", () => ({
  fetchYoutubeSearchSuggestions: vi.fn(async () => []),
}));

vi.mock("@/lib/store", () => ({
  getCachedExpandedQueries: vi.fn(async () => null),
  cacheExpandedQueries: vi.fn(async () => undefined),
  hashTopic: (value: string) => value,
}));

import { expandQueries, fallbackQueries } from "@/lib/services/query-expansion";
import { fetchYoutubeSearchSuggestions } from "@/lib/services/youtube-query-suggest";
import { cacheExpandedQueries, getCachedExpandedQueries } from "@/lib/store";

describe("expandQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedExpandedQueries).mockResolvedValue(null);
  });

  it("returns deduped queries with the topic first", async () => {
    const { queries, cached } = await expandQueries("best budget espresso machine", {
      maxQueries: 5,
    });

    expect(cached).toBe(false);
    expect(queries[0]).toBe("best budget espresso machine");
    expect(queries.length).toBeGreaterThanOrEqual(2);
    expect(queries.some((q) => q.includes("solo developer"))).toBe(false);
    expect(cacheExpandedQueries).toHaveBeenCalled();
  });

  it("uses autocomplete suggestions when available", async () => {
    vi.mocked(fetchYoutubeSearchSuggestions).mockResolvedValue([
      "best espresso machine under 500",
      "budget espresso machine review",
    ]);

    const { queries } = await expandQueries("budget espresso machine", { maxQueries: 5 });

    expect(queries).toContain("best espresso machine under 500");
    expect(fetchYoutubeSearchSuggestions).toHaveBeenCalledWith("budget espresso machine");
  });

  it("marks repeat expansions as cached for usage limits", async () => {
    vi.mocked(getCachedExpandedQueries)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(["how do i ship a saas solo", "how to ship a saas solo", "ship a saas solo tutorial"]);

    const first = await expandQueries("how do i ship a saas solo", { maxQueries: 5 });
    expect(first.cached).toBe(false);

    const second = await expandQueries("how do i ship a saas solo", { maxQueries: 5 });
    expect(second.cached).toBe(true);
  });
});

describe("fallbackQueries", () => {
  it("uses builder-style templates for shipping/build topics", () => {
    const queries = fallbackQueries("how do i ship a saas solo");
    expect(queries.some((q) => q.startsWith("how to "))).toBe(true);
    expect(queries.some((q) => q.includes("building"))).toBe(true);
  });

  it("uses generic templates for product/review topics", () => {
    const queries = fallbackQueries("best budget espresso machine");
    expect(queries.some((q) => q.includes("review"))).toBe(true);
    expect(queries.some((q) => q.includes("solo developer"))).toBe(false);
  });
});
