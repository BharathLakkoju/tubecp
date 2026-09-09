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
    <html lang="en" data-theme-id="github">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; border-radius: 0 !important; }
          body {
            font-family: 'IBM Plex Mono', ui-monospace, monospace;
            background: #ffffff;
            color: #1f2328;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 60px 24px;
          }
          .container { max-width: 860px; width: 100%; }
          h2 { font-size: 18px; font-weight: 600; margin-bottom: 10px; }
          p { font-size: 14px; color: #57606a; line-height: 1.6; }
          button {
            margin-top: 24px;
            background: #0969da;
            color: #ffffff;
            border: 1px solid #0969da;
            padding: 16px 20px;
            font-family: 'IBM Plex Mono', ui-monospace, monospace;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
          }
          button:hover { background: #0550ae; border-color: #0550ae; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h2>
            <span style={{ color: "#0969da" }}>[</span>
            error
            <span style={{ color: "#0969da" }}>]</span>
          </h2>
          <p>We&apos;ve been notified. Please try again.</p>
          <button onClick={reset}>try again →</button>
        </div>
      </body>
    </html>
  );
}
