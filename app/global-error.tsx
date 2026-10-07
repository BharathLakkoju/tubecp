"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort error boundary. It replaces the root layout, so it loads the token file itself
 * and uses plain elements styled with token classes (no providers are available here).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" data-color-scheme="light">
      <body className="flex min-h-dvh items-center justify-center px-6 py-16">
        <main className="flex w-full max-w-md flex-col items-start gap-4">
          <h1 className="font-mono text-headline font-semibold text-foreground">
            <span className="text-primary">[</span>error<span className="text-primary">]</span>
          </h1>
          <p className="text-body text-foreground-secondary">
            Something went wrong. We&apos;ve been notified. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-body-sm font-medium text-primary-foreground transition-colors duration-(--duration-fast) hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
