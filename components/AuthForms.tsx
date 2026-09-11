"use client";

import Link from "next/link";
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

function AuthDivider() {
  return (
    <div className="auth-divider" aria-hidden="true">
      <span>or</span>
    </div>
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
      onError(
        result.error === "Configuration"
          ? "OAuth is not configured on the server."
          : "Sign in failed"
      );
      return;
    }

    if (result?.url) {
      window.location.href = result.url;
    }
  };

  if (providers.length === 0) return null;

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/app",
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    if (result?.url) {
      window.location.href = result.url;
    }
  };

  const showOAuth = providers.length > 0;

  return (
    <div className="auth-form">
      {error && <AuthError message={error} />}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span className="auth-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={loading}
          />
        </label>
        <label className="auth-field">
          <span className="auth-label">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={loading}
          />
        </label>
        <button type="submit" className="btn-primary btn-block" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {showOAuth && (
        <>
          <AuthDivider />
          <OAuthButtons providers={providers} disabled={loading} onError={setError} />
        </>
      )}

      <p className="auth-footer">
        No account? <Link href="/sign-up">Create one</Link>
      </p>
    </div>
  );
}

export function SignUpForm({ providers }: { providers: OAuthProviderId[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const registerRes = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const registerData = await registerRes.json().catch(() => ({}));

    if (!registerRes.ok) {
      setLoading(false);
      setError(registerData.error ?? "Sign up failed");
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/app",
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Account created, but sign-in failed. Try signing in manually.");
      return;
    }

    if (result?.url) {
      window.location.href = result.url;
    }
  };

  const showOAuth = providers.length > 0;

  return (
    <div className="auth-form">
      {error && <AuthError message={error} />}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span className="auth-label">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            disabled={loading}
          />
        </label>
        <label className="auth-field">
          <span className="auth-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={loading}
          />
        </label>
        <label className="auth-field">
          <span className="auth-label">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={loading}
          />
        </label>
        <button type="submit" className="btn-primary btn-block" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      {showOAuth && (
        <>
          <AuthDivider />
          <OAuthButtons providers={providers} disabled={loading} onError={setError} />
        </>
      )}

      <p className="auth-footer">
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}
