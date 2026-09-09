export function isE2eAuthBypass(): boolean {
  return process.env.E2E_AUTH_BYPASS === "true";
}
