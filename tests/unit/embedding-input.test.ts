import { describe, expect, it } from "vitest";
import {
  hasMeaningfulEmbeddingContent,
  prepareEmbeddingInput,
  sanitizeEmbeddingInput,
} from "@/lib/embedding-input";

describe("sanitizeEmbeddingInput", () => {
  it("replaces backslashes that break downstream JSON parsers", () => {
    const input = 'Windows path C:\\Users\\dev and hex \\x1 fragment at end \\x';
    const output = sanitizeEmbeddingInput(input);

    expect(output).not.toContain("\\");
    expect(output).toContain("C:/Users/dev");
  });

  it("removes control characters", () => {
    const output = sanitizeEmbeddingInput("hello\u0000world");
    expect(output).toBe("helloworld");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(sanitizeEmbeddingInput("")).toBe("");
    expect(sanitizeEmbeddingInput("   ")).toBe("");
  });
});

describe("prepareEmbeddingInput", () => {
  it("uses a fallback for whitespace-only input", () => {
    expect(prepareEmbeddingInput("")).toBe("video transcript excerpt");
    expect(prepareEmbeddingInput("*** ###")).toBe("video transcript excerpt");
  });

  it("never returns an empty string", () => {
    expect(prepareEmbeddingInput("\\x\\u").length).toBeGreaterThan(0);
    expect(prepareEmbeddingInput("\\x\\u").trim().length).toBeGreaterThan(0);
  });

  it("truncates long text safely", () => {
    const long = "a".repeat(9000);
    expect(prepareEmbeddingInput(long).length).toBeLessThanOrEqual(8000);
  });
});

describe("hasMeaningfulEmbeddingContent", () => {
  it("requires a few letters or numbers", () => {
    expect(hasMeaningfulEmbeddingContent("how to build apps")).toBe(true);
    expect(hasMeaningfulEmbeddingContent("***")).toBe(false);
  });
});
