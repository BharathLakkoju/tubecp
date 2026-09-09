import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("eval dataset", () => {
  it("is valid JSON with required fields per topic", () => {
    const raw = fs.readFileSync(path.join(process.cwd(), "eval", "dataset.json"), "utf-8");
    const dataset = JSON.parse(raw) as {
      topics: Array<{
        id: string;
        topic: string;
        minRelevantVideos: number;
        relevanceMin: number;
      }>;
    };

    expect(dataset.topics.length).toBeGreaterThanOrEqual(5);

    for (const item of dataset.topics) {
      expect(item.id).toBeTruthy();
      expect(item.topic.length).toBeGreaterThan(10);
      expect(item.minRelevantVideos).toBeGreaterThan(0);
      expect(item.relevanceMin).toBeGreaterThanOrEqual(40);
      expect(item.relevanceMin).toBeLessThanOrEqual(100);
    }

    const ids = dataset.topics.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
