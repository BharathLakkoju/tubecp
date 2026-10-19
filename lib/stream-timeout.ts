/** Reject if an async iterable produces no item within `idleMs`. */
export async function consumeWithIdleTimeout<T>(
  iterable: AsyncIterable<T>,
  onItem: (item: T) => void | Promise<void>,
  options: { idleMs: number; maxMs?: number }
): Promise<void> {
  const started = Date.now();
  const iterator = iterable[Symbol.asyncIterator]();

  while (true) {
    if (options.maxMs !== undefined && Date.now() - started > options.maxMs) {
      throw new Error("Download timed out");
    }

    const next = await Promise.race([
      iterator.next(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Download stalled")), options.idleMs)
      ),
    ]);

    if (next.done) break;
    await onItem(next.value);
  }
}
