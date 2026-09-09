import { describe, expect, it } from "vitest";
import { combineScores, metadataText } from "@/lib/services/semantic";
import { mockVideo } from "../fixtures/research";

describe("combineScores", () => {
  it("weights LLM, semantic, and metadata scores", () => {
    const score = combineScores(80, 70, 60, "brief");
    expect(score).toBe(Math.round(80 * 0.35 + 70 * 0.4 + 60 * 0.25));
  });

  it("boosts substantial discussion", () => {
    const brief = combineScores(70, 70, 70, "brief");
    const substantial = combineScores(70, 70, 70, "substantial");
    expect(substantial).toBeGreaterThan(brief);
    expect(substantial).toBeLessThanOrEqual(100);
  });

  it("caps mentioned videos with low semantic score", () => {
    const score = combineScores(90, 20, 80, "mentioned");
    expect(score).toBeLessThanOrEqual(45);
  });

  it("clamps to 0-100", () => {
    expect(combineScores(0, 0, 0, "mentioned")).toBe(0);
    expect(combineScores(100, 100, 100, "substantial")).toBe(100);
  });
});

describe("metadataText", () => {
  it("includes title, channel, and description", () => {
    const video = mockVideo({
      title: "AI SaaS Pricing",
      channel: "Founder TV",
      description: "MRR and pricing models",
    });
    const text = metadataText(video);
    expect(text).toContain("AI SaaS Pricing");
    expect(text).toContain("Founder TV");
    expect(text).toContain("MRR");
  });

  it("truncates very long metadata", () => {
    const video = mockVideo({ description: "x".repeat(3000) });
    expect(metadataText(video).length).toBeLessThanOrEqual(2000);
  });
});
