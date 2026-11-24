import { getAppUrl, isLocalAppUrl } from "@/lib/app-url";

/** Local Next.js (not Vercel) — Inngest Cloud cannot invoke this host without a tunnel. */
export function isLocalKbBuildDeployment(): boolean {
  if (process.env.VERCEL || process.env.VERCEL_ENV) return false;
  return isLocalAppUrl(getAppUrl());
}

export function inngestDevModeEnabled(): boolean {
  const value = process.env.INNGEST_DEV?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function kbInngestRunnerReady(): boolean {
  if (!isLocalKbBuildDeployment()) return true;
  return inngestDevModeEnabled();
}

export const KB_RUNNER_MISCONFIGURED_MESSAGE =
  "Server indexing needs the Inngest dev server on this machine. Run `npm run inngest:dev` in another terminal, set INNGEST_DEV=1 in .env, restart the app, then resume.";

export class KbBuildRunnerMisconfiguredError extends Error {
  readonly code = "KB_RUNNER_MISCONFIGURED";

  constructor(message = KB_RUNNER_MISCONFIGURED_MESSAGE) {
    super(message);
    this.name = "KbBuildRunnerMisconfiguredError";
  }
}

export function assertKbInngestRunnerConfigured(): void {
  if (!kbInngestRunnerReady()) {
    throw new KbBuildRunnerMisconfiguredError();
  }
}