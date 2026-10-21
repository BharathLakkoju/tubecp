/** Reject if an async iterable produces no item within `idleMs`. */
export async function consumeWithIdleTimeout<T>(
  iterable: AsyncIterable<T>,
  onItem: (item: T) => void | Promise<void>,
  options: { idleMs: number; maxMs?: number }
): Promise<void> {
  const started = Date.now();
  const iterator = iterable[Symbol.asyncIterator]();

  try {
    while (true) {
      if (options.maxMs !== undefined && Date.now() - started > options.maxMs) {
        throw new Error("Download timed out");
      }

      let timer: ReturnType<typeof setTimeout> | undefined;
      const next = await Promise.race([
        iterator.next(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Download stalled")), options.idleMs);
        }),
      ]).finally(() => {
        if (timer !== undefined) clearTimeout(timer);
      });

      if (next.done) return;
      await onItem(next.value);
    }
  } finally {
    await iterator.return?.().catch(() => undefined);
  }
}
