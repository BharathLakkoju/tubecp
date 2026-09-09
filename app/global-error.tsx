"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

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
    <html>
      <body style={{ background: "#0a0a0f", color: "#e8e8f0", fontFamily: "system-ui", padding: "2rem" }}>
        <h2>Something went wrong</h2>
        <p style={{ color: "#8888a0" }}>We&apos;ve been notified. Please try again.</p>
        <button
          onClick={reset}
          style={{
            marginTop: "1rem",
            background: "#ff4444",
            color: "white",
            border: "none",
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
