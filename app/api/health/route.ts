import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { isProduction } from "@/lib/env";
import { getPolarProductStatus } from "@/lib/plans";
import { hasKv } from "@/lib/store";
import { getYouTubeQuotaUsage } from "@/lib/usage/youtube-quota";

function hasOAuthProvider(): boolean {
  const google =
    Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());
  const github =
    Boolean(process.env.GITHUB_CLIENT_ID?.trim()) &&
    Boolean(process.env.GITHUB_CLIENT_SECRET?.trim());
  return google || github;
}

export async function GET() {
  const polarProducts = getPolarProductStatus();
  const youtubeQuota = await getYouTubeQuotaUsage();
  const production = isProduction();

  const checks = {
    youtubeKey: Boolean(config.youtubeApiKey),
    openrouterKey: Boolean(config.openrouterApiKey),
    resendKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    emailFrom: Boolean(process.env.EMAIL_FROM?.trim()),
    kv: hasKv(),
    databaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    authSecret: Boolean(process.env.AUTH_SECRET?.trim()),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.AUTH_URL?.trim()),
    polarAccessToken: Boolean(process.env.POLAR_ACCESS_TOKEN?.trim()),
    polarWebhookSecret: Boolean(process.env.POLAR_WEBHOOK_SECRET?.trim()),
    polarProProduct: polarProducts.pro,
    polarResearcherProduct: polarProducts.researcher,
    googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()),
    githubOAuth: Boolean(process.env.GITHUB_CLIENT_ID?.trim() && process.env.GITHUB_CLIENT_SECRET?.trim()),
    oauthProvider: hasOAuthProvider(),
    devBypassDisabled:
      !production ||
      (process.env.E2E_AUTH_BYPASS !== "true" && process.env.DEV_BYPASS_USAGE_LIMITS !== "true"),
    youtubeQuota,
  };

  const healthy =
    checks.youtubeKey &&
    checks.openrouterKey &&
    checks.kv &&
    checks.databaseUrl &&
    checks.authSecret &&
    checks.appUrl &&
    checks.polarAccessToken &&
    checks.polarWebhookSecret &&
    checks.polarProProduct &&
    checks.oauthProvider &&
    checks.devBypassDisabled &&
    (!production || (checks.resendKey && checks.emailFrom)) &&
    !youtubeQuota.warning;

  return NextResponse.json({
    status: healthy ? "ok" : "degraded",
    checks,
    platform: "vercel-serverless",
  });
}
