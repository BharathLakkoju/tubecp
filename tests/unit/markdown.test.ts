import { describe, expect, it } from "vitest";
import { normalizeMarkdown, nextRevealIndex, sanitizeMarkdownHref } from "@/lib/markdown";

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

describe("sanitizeMarkdownHref", () => {
  it("allows https and http links", () => {
    expect(sanitizeMarkdownHref("https://www.youtube.com/watch?v=abc")).toBe(
      "https://www.youtube.com/watch?v=abc"
    );
    expect(sanitizeMarkdownHref("http://example.com/path")).toBe("http://example.com/path");
  });

  it("allows mailto and safe relative links", () => {
    expect(sanitizeMarkdownHref("mailto:user@example.com")).toBe("mailto:user@example.com");
    expect(sanitizeMarkdownHref("/pricing")).toBe("/pricing");
    expect(sanitizeMarkdownHref("#section-1")).toBe("#section-1");
  });

  it("blocks javascript and data URLs", () => {
    expect(sanitizeMarkdownHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeMarkdownHref("JAVASCRIPT:alert(1)")).toBeNull();
    expect(sanitizeMarkdownHref("javascript%3Aalert(1)")).toBeNull();
    expect(sanitizeMarkdownHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(sanitizeMarkdownHref("vbscript:msgbox(1)")).toBeNull();
  });

  it("blocks protocol-relative and unknown schemes", () => {
    expect(sanitizeMarkdownHref("//evil.example/phish")).toBeNull();
    expect(sanitizeMarkdownHref("file:///etc/passwd")).toBeNull();
    expect(sanitizeMarkdownHref("blob:https://example.com/uuid")).toBeNull();
  });
});

describe("nextRevealIndex", () => {
  it("reveals one word at a time", () => {
    const buffer = "Hello world";
    expect(nextRevealIndex(buffer, 0)).toBe(6);
    expect(nextRevealIndex(buffer, 6)).toBe(11);
  });
});
