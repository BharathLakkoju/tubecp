import * as Sentry from "@sentry/nextjs";

export function captureException(err: unknown, extra?: Record<string, unknown>): void {
  console.error(err, extra);
  Sentry.captureException(err, extra ? { extra } : undefined);
}
