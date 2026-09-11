/**
 * Print OAuth callback URLs and env vars for ngrok / local dev.
 *
 * Usage:
 *   npx tsx scripts/print-auth-urls.ts
 *   npx tsx scripts/print-auth-urls.ts https://abc123.ngrok-free.app
 */

import { getAppUrl, getOAuthCallbackUrl } from "../lib/app-url";

const argUrl = process.argv[2];

if (argUrl) {
  process.env.NGROK_URL = argUrl;
  process.env.AUTH_URL = argUrl;
  process.env.NEXT_PUBLIC_APP_URL = argUrl;
}

const appUrl = getAppUrl();
const googleCallback = getOAuthCallbackUrl("google");
const githubCallback = getOAuthCallbackUrl("github");

console.log("\nAuth.js (NextAuth) URLs\n=====================\n");
console.log(`App URL:          ${appUrl}`);
console.log(`Google callback:  ${googleCallback}`);
console.log(`GitHub callback:  ${githubCallback}`);
console.log("\nAdd to .env.local:\n");
console.log(`AUTH_URL=${appUrl}`);
console.log(`NEXT_PUBLIC_APP_URL=${appUrl}`);
if (argUrl) {
  console.log(`NGROK_URL=${argUrl}`);
}
console.log(`# AUTH_SECRET=  # openssl rand -base64 32`);
console.log("\nOAuth provider settings:\n");
console.log(`Google  → Authorized redirect URI: ${googleCallback}`);
console.log(`GitHub  → Authorization callback URL: ${githubCallback}`);
console.log("");
