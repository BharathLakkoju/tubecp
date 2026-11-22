const OAUTH_SIGN_IN_ERRORS: Record<string, string> = {
  OAuthSignin: "Could not start Google or GitHub sign-in. Check OAuth credentials.",
  OAuthCallback:
    "Google or GitHub rejected the sign-in callback. The Authorized redirect URI in the provider console must be exactly the production or localhost callback printed by `npm run auth:urls`.",
  OAuthCreateAccount: "Could not create an account from this OAuth login.",
  OAuthAccountNotLinked:
    "This email is already used with a different sign-in method. Sign in with email and password, then link the provider from account settings.",
  AccessDenied: "Access was denied. This Google account may not be allowed for this app.",
  Configuration: "Sign-in is not configured on the server.",
  Verification: "The verification link is invalid or expired.",
  Default: "Sign in failed. Try again.",
};

export function oauthSignInErrorMessage(error: string | undefined | null): string | null {
  if (!error?.trim()) return null;
  return OAUTH_SIGN_IN_ERRORS[error] ?? OAUTH_SIGN_IN_ERRORS.Default;
}
