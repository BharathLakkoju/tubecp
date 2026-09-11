export type OAuthProviderId = "google" | "github";

/** OAuth providers with both client ID and secret configured. */
export function getConfiguredOAuthProviders(): OAuthProviderId[] {
  const providers: OAuthProviderId[] = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push("google");
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push("github");
  }

  return providers;
}
