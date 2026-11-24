/** Turn Event / AggregateError / nested `cause` into a readable string. */
export function formatUnknownError(err: unknown): string {
  if (err instanceof Error) {
    const extra = (err as Error & { sourceError?: unknown; cause?: unknown }).sourceError ?? err.cause;
    const nested = extra !== undefined ? formatUnknownError(extra) : "";
    if (nested && nested !== err.message) {
      return `${err.message}: ${nested}`;
    }
    return err.message || err.name;
  }

  if (err && typeof err === "object") {
    const event = err as { type?: unknown; message?: unknown; error?: unknown; code?: unknown };
    if (event.type === "error") {
      if (event.error !== undefined) return formatUnknownError(event.error);
      if (typeof event.message === "string" && event.message && event.message !== "[object ErrorEvent]") {
        return event.message;
      }
      return "Database connection failed";
    }
    if (typeof event.code === "string" && /ETIMEDOUT|ECONNRESET|ENOTFOUND|UND_ERR/i.test(event.code)) {
      return event.code;
    }
    if (Array.isArray((err as AggregateError).errors)) {
      return (err as AggregateError).errors.map(formatUnknownError).filter(Boolean).join("; ") || "Network error";
    }
  }

  const asString = String(err ?? "Unknown error");
  return asString === "[object ErrorEvent]" ? "Database connection failed" : asString;
}

export function isTransientConnectivityError(err: unknown): boolean {
  const text = formatUnknownError(err);
  return /ETIMEDOUT|ECONNRESET|ENOTFOUND|fetch failed|Error connecting to database|Database connection failed|UND_ERR|socket/i.test(
    text
  );
}