import { describe, expect, it } from "vitest";
import { consumeWithIdleTimeout } from "@/lib/stream-timeout";

describe("consumeWithIdleTimeout", () => {
  it("clears the idle timer after each chunk", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (err: unknown) => {
      unhandled.push(err);
    };
    process.on("unhandledRejection", onUnhandled);

    try {
      async function* chunks() {
        yield "a";
        yield "b";
      }
      const seen: string[] = [];
      await consumeWithIdleTimeout(chunks(), (chunk) => {
        seen.push(chunk);
      }, { idleMs: 30 });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(seen).toEqual(["a", "b"]);
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("rejects when the stream stalls and closes the iterator", async () => {
    let returned = false;
    const iterator = {
      next: () => new Promise<IteratorResult<string>>(() => undefined),
      async return() {
        returned = true;
        return { done: true as const, value: undefined };
      },
    };
    const iterable = {
      [Symbol.asyncIterator]() {
        return iterator;
      },
    };

    await expect(
      consumeWithIdleTimeout(iterable, () => undefined, { idleMs: 20 })
    ).rejects.toThrow(/stalled/);
    expect(returned).toBe(true);
  });
});
