import * as Sentry from "@sentry/nextjs";
import { getSentryClientOptions } from "@/lib/sentry-client-config";

const options = getSentryClientOptions();

if (options) {
  Sentry.init(options);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
