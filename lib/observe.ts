import * as Sentry from "@sentry/nextjs";
import { formatUnknownError } from "@/lib/error-format";

function errorLogPayload(err: unknown): unknown {
  if (err instanceof Error) return err;
  return formatUnknownError(err);
}

export function captureException(err: unknown, extra?: Record<string, unknown>): void {
  console.error(errorLogPayload(err), extra);
  Sentry.captureException(err instanceof Error ? err : new Error(String(errorLogPayload(err))), {
    extra,
  });
}
