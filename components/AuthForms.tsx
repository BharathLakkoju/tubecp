"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import type { OAuthProviderId } from "@/lib/auth-providers";

function AuthError({ message }: { message: string }) {
  return (
    <p className="border border-red-500/40 bg-red-500/10 px-4 py-3 font-mono text-[13px] text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

const PROVIDER_LABELS: Record<OAuthProviderId, string> = {
  google: "Continue with Google",
  github: "Continue with GitHub",
};

function SocialButton({
  provider,
  label,
  disabled,
  onClick,
}: {
  provider: OAuthProviderId;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`auth-oauth-btn auth-oauth-btn-${provider}`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function OAuthButtons({
  providers,
  disabled,
  onError,
}: {
  providers: OAuthProviderId[];
  disabled: boolean;
  onError: (message: string) => void;
}) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderId | null>(null);

  const signInWith = async (provider: OAuthProviderId) => {
    onError("");
    setLoadingProvider(provider);

    const result = await signIn(provider, { callbackUrl: "/app", redirect: false });
    setLoadingProvider(null);

    if (result?.error) {
      onError(result.error === "Configuration" ? "OAuth is not configured on the server." : "Sign in failed");
      return;
    }

    if (result?.url) {
      window.location.href = result.url;
    }
  };

  if (providers.length === 0) {
    return (
      <p className="font-mono text-[13px] text-text-muted">
        OAuth sign-in is not configured. Add{" "}
        <code className="text-text">GOOGLE_CLIENT_ID</code> /{" "}
        <code className="text-text">GITHUB_CLIENT_ID</code> (and secrets) to your environment.
      </p>
    );
  }

  const busy = disabled || loadingProvider !== null;

  return (
    <div className="auth-oauth-stack">
      {providers.map((provider) => (
        <SocialButton
          key={provider}
          provider={provider}
          label={
            loadingProvider === provider ? "Connecting..." : PROVIDER_LABELS[provider]
          }
          disabled={busy}
          onClick={() => signInWith(provider)}
        />
      ))}
    </div>
  );
}

export function SignInForm({ providers }: { providers: OAuthProviderId[] }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="auth-form">
      {error && <AuthError message={error} />}
      <OAuthButtons providers={providers} disabled={false} onError={setError} />
      <p className="auth-footer">
        First visit? Choose a provider above — we&apos;ll create your account automatically.
      </p>
    </div>
  );
}
