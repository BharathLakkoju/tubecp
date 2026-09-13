import { beforeEach, describe, expect, it } from "vitest";
import {
  addToKbVectorIndex,
  deleteKbVectorIndex,
  searchKbVectorIndex,
} from "@/lib/store/vector-index";

function vector(first: number, second = 0): number[] {
  return Array.from({ length: 16 }, (_, index) => (index === 0 ? first : index === 1 ? second : 0));
}

describe("searchKbVectorIndex", () => {
  const kbId = "kb-vector-test";

  beforeEach(async () => {
    await deleteKbVectorIndex(kbId);
  });

  it("returns the closest match for small indexes", async () => {
    await addToKbVectorIndex(kbId, [
      { id: "a", embedding: vector(1, 0) },
      { id: "b", embedding: vector(0, 1) },
    ]);

    const hits = await searchKbVectorIndex(kbId, vector(0.9, 0.1), 1);
    expect(hits[0]?.id).toBe("a");
  });

  it("uses IVF buckets for larger indexes", async () => {
    const entries = Array.from({ length: 60 }, (_, index) => ({
      id: `chunk-${index}`,
      embedding: vector(index % 2 === 0 ? 1 : -1, index % 3 === 0 ? 1 : -1),
    }));

    await addToKbVectorIndex(kbId, entries);

    const hits = await searchKbVectorIndex(kbId, vector(1, 1), 3);
    expect(hits.length).toBe(3);
    expect(hits[0]?.score).toBeGreaterThan(0);
  });
});
