/** Default user ID for E2E bypass (numeric — matches Auth.js integer user IDs). */
export const E2E_DEFAULT_USER_ID = "1";

export function isE2eAuthBypass(): boolean {
  return process.env.E2E_AUTH_BYPASS === "true";
}
