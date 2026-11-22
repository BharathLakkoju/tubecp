export type OAuthProviderId = "google" | "github";

export const ALL_OAUTH_PROVIDERS: OAuthProviderId[] = ["google", "github"];

/** OAuth providers with both client ID and secret configured. */
export function getConfiguredOAuthProviders(): OAuthProviderId[] {
  const providers: OAuthProviderId[] = [];

  if (process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    providers.push("google");
  }

  if (process.env.GITHUB_CLIENT_ID?.trim() && process.env.GITHUB_CLIENT_SECRET?.trim()) {
    providers.push("github");
  }

  return providers;
}

/** Production shows only configured providers. Local always shows Google and GitHub. */
export function oauthProvidersToShow(configured: OAuthProviderId[]): OAuthProviderId[] {
  if (process.env.NODE_ENV === "production") return configured;
  return [...ALL_OAUTH_PROVIDERS];
}

export function missingOAuthEnv(id: OAuthProviderId): string {
  return id === "google"
    ? "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
    : "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET";
}
