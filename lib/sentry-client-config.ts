import type { Integration } from "@sentry/core";
import type { BrowserOptions } from "@sentry/react";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function getSentryClientOptions(): BrowserOptions | null {
  if (!dsn) return null;

  return {
    dsn,
    enabled: true,
    tunnel: "/api/monitoring",
    tracesSampleRate: 0,
    integrations(integrations: Integration[]) {
      // BrowserTracing auto-registers WebVitals, whose CLS reporter can throw on
      // layout-shift races in our animated UI. Keep error capture only.
      return integrations.filter(
        (integration) =>
          integration.name !== "WebVitals" &&
          integration.name !== "BrowserTracing"
      );
    },
  };
}
