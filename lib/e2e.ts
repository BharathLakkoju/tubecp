import { isProduction } from "@/lib/env";

/** Default user ID for E2E bypass (numeric — matches Auth.js integer user IDs). */
export const E2E_DEFAULT_USER_ID = "1";

export function isE2eAuthBypass(): boolean {
  if (process.env.E2E_AUTH_BYPASS !== "true") return false;
  // Allow Playwright CI (production build + stub APIs) without weakening real deployments.
  if (isProduction() && process.env.E2E_STUB_APIS !== "true") return false;
  return true;
}
