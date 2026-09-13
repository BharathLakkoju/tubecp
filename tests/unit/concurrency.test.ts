import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "@/lib/concurrency";

describe("mapWithConcurrency", () => {
  it("maps all items", async () => {
    const result = await mapWithConcurrency([1, 2, 3], 2, async (value) => value * 2);
    expect(result).toEqual([2, 4, 6]);
  });

  it("limits concurrency", async () => {
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return true;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
