import { describe, expect, it } from "vitest";
import { normalizeMarkdown, nextRevealIndex } from "@/lib/markdown";

describe("normalizeMarkdown", () => {
  it("splits inline table rows onto separate lines", () => {
    const input =
      "| Signal | How to Check | |--------|-------------| | Search interest | Google Trends |";
    const output = normalizeMarkdown(input);

    expect(output).toContain("| Signal | How to Check |");
    expect(output).toContain("|--------|-------------|");
    expect(output).toContain("| Search interest | Google Trends |");
  });
});

describe("nextRevealIndex", () => {
  it("reveals one word at a time", () => {
    const buffer = "Hello world";
    expect(nextRevealIndex(buffer, 0)).toBe(6);
    expect(nextRevealIndex(buffer, 6)).toBe(11);
  });
});
