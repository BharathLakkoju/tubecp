import { describe, expect, it } from "vitest";
import {
  detectQueryIntent,
  introducesFormatWords,
  parseParaphrases,
  queryPreservesTopic,
} from "@/lib/services/query-expansion";
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

describe("query expansion filters", () => {
  it("classifies learn vs compare vs generic intent", () => {
    expect(detectQueryIntent("how do i ship a saas solo")).toBe("learn");
    expect(detectQueryIntent("best budget espresso machine")).toBe("compare");
    expect(detectQueryIntent("AI SaaS monetization")).toBe("generic");
  });

  it("requires core topic terms in expansions", () => {
    expect(queryPreservesTopic("AI SaaS monetization", "AI SaaS revenue")).toBe(true);
    expect(queryPreservesTopic("AI SaaS monetization", "monetization for beginners")).toBe(false);
    expect(queryPreservesTopic("best budget espresso machine", "budget espresso machine review")).toBe(
      true
    );
  });

  it("detects format words that were not in the topic", () => {
    expect(introducesFormatWords("AI SaaS monetization", "AI SaaS monetization for beginners")).toBe(
      true
    );
    expect(introducesFormatWords("sourdough for beginners", "sourdough for beginners oven")).toBe(
      false
    );
  });

  it("parses JSON array or { queries } paraphrases", () => {
    expect(parseParaphrases('["AI SaaS revenue", "AI SaaS pricing"]')).toEqual([
      "AI SaaS revenue",
      "AI SaaS pricing",
    ]);
    expect(parseParaphrases('Here you go: {"queries": ["AI SaaS MRR"]}')).toEqual(["AI SaaS MRR"]);
  });
});
