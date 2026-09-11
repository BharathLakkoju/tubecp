function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/** Public app URL used for OAuth redirects, Polar checkout, and auth callbacks. */
export function getAppUrl(): string {
  const url =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NGROK_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return normalizeOrigin(url);
}

export function getOAuthCallbackUrl(provider: "google" | "github"): string {
  return `${getAppUrl()}/api/auth/callback/${provider}`;
}
