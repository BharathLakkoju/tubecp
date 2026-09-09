"use client";

import { useMemo } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { buildClerkAppearance } from "@/lib/clerkTheme";
import { useTheme } from "@/components/ThemeProvider";

export function AuthSignIn() {
  const { themeId } = useTheme();
  const appearance = useMemo(
    () => buildClerkAppearance(themeId, { hideHeader: true }),
    [themeId]
  );

  return (
    <SignIn
      appearance={appearance}
      signUpUrl="/sign-up"
      forceRedirectUrl="/app"
    />
  );
}

export function AuthSignUp() {
  const { themeId } = useTheme();
  const appearance = useMemo(
    () => buildClerkAppearance(themeId, { hideHeader: true }),
    [themeId]
  );

  return (
    <SignUp
      appearance={appearance}
      signInUrl="/sign-in"
      forceRedirectUrl="/app"
    />
  );
}
