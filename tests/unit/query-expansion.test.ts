import { describe, expect, it } from "vitest";
import { dedupeQueries, sanitizeExpandedQuery } from "@/lib/services/research-scoring";

describe("sanitizeExpandedQuery", () => {
  it("strips stale years when the topic has no year", () => {
    expect(
      sanitizeExpandedQuery(
        "how to build a profitable mobile app solo - step by step guide 2024",
        "how do i make profitable apps solo"
      )
    ).toBe("how to build a profitable mobile app solo - step by step guide");
  });

  it("updates stale years when the topic already has a year", () => {
    const cleaned = sanitizeExpandedQuery("AI tools 2024 guide", "AI tools 2025");
    expect(cleaned).not.toContain("2024");
    expect(cleaned).toMatch(/20\d{2}/);
  });
});

describe("dedupeQueries", () => {
  it("keeps the topic first and limits query count", () => {
    const queries = dedupeQueries(
      "how do i make profitable apps solo",
      [
        "how do i make profitable apps solo",
        "how I build profitable apps solo",
        "solo developer profitable apps",
        "profitable apps architecture patterns",
        "app monetization solo dev",
        "extra query",
      ],
      5
    );

    expect(queries[0]).toBe("how do i make profitable apps solo");
    expect(queries.length).toBeLessThanOrEqual(5);
    expect(queries.some((q) => q.includes("2024"))).toBe(false);
  });
});
