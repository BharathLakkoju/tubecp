import * as Sentry from "@sentry/nextjs";

const enabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

if (enabled) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    enabled,
    integrations(integrations) {
      // Sentry's CLS reporter uses reportAllChanges and can throw when layout
      // shifts race (e.g. sidebar menus / delete overlay). Keep errors + tracing.
      return integrations.filter((integration) => integration.name !== "WebVitals");
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
