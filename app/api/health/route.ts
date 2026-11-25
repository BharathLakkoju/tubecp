import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { createDbPool } from "@/lib/db";
import { isProduction } from "@/lib/env";
import { getPolarProductStatus } from "@/lib/plans";
import { getRedis } from "@/lib/store/redis";
import { pingUpstashVector } from "@/lib/store/upstash-vector";
import { getYouTubeQuotaUsage } from "@/lib/usage/youtube-quota";

async function pingRedis(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const pong = await redis.ping();
    return pong === "PONG" || pong === "pong" || Boolean(pong);
  } catch {
    return false;
  }
}

async function pingDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  try {
    const pool = createDbPool();
    await pool.query("SELECT 1");
    await pool.end();
    return true;
  } catch {
    return false;
  }
}

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
    kv: await pingRedis(),
    vector: await pingUpstashVector(),
    databaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    databaseLive: await pingDatabase(),
    authSecret: Boolean(process.env.AUTH_SECRET?.trim()),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.AUTH_URL?.trim()),
    polarAccessToken: Boolean(process.env.POLAR_ACCESS_TOKEN?.trim()),
    polarWebhookSecret: Boolean(process.env.POLAR_WEBHOOK_SECRET?.trim()),
    polarProProduct: polarProducts.pro,
    inngestEventKey: Boolean(process.env.INNGEST_EVENT_KEY?.trim()),
    inngestSigningKey: Boolean(process.env.INNGEST_SIGNING_KEY?.trim()),
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
    checks.databaseLive &&
    checks.authSecret &&
    checks.appUrl &&
    checks.polarAccessToken &&
    checks.polarWebhookSecret &&
    checks.polarProProduct &&
    checks.oauthProvider &&
    checks.devBypassDisabled &&
    (!production || (checks.resendKey && checks.emailFrom)) &&
    (!production || (checks.inngestEventKey && checks.inngestSigningKey)) &&
    (!production || checks.vector) &&
    !youtubeQuota.warning;

  return NextResponse.json({
    status: healthy ? "ok" : "degraded",
    checks,
    platform: "vercel-serverless",
  });
}
