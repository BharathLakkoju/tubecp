"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import type { OAuthProviderId } from "@/lib/auth-providers";
import { authLinkWithCallback } from "@/lib/billing/checkout-flow";

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
  callbackUrl,
  onError,
}: {
  providers: OAuthProviderId[];
  disabled: boolean;
  callbackUrl: string;
  onError: (message: string) => void;
}) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderId | null>(null);

  const signInWith = async (provider: OAuthProviderId) => {
    onError("");
    setLoadingProvider(provider);

    const result = await signIn(provider, { callbackUrl, redirect: false });
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

type AuthFormProps = {
  providers: OAuthProviderId[];
  callbackUrl: string;
};

export function SignInForm({ providers, callbackUrl }: AuthFormProps) {
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
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(
        "Invalid email or password. If you signed up with email, verify your inbox first."
      );
      return;
    }

    if (result?.url) {
      window.location.href = result.url;
    }
  };

  const resendVerification = async () => {
    if (!email.trim()) {
      setError("Enter your email above, then try resending verification.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Could not resend verification email.");
      return;
    }
    setError(null);
    alert("If an unverified account exists for that email, a new verification link was sent.");
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
        <p className="auth-footer !mt-0 !border-0 !pt-0 text-left">
          <Link href="/forgot-password">Forgot password?</Link>
          {" · "}
          <button
            type="button"
            className="text-text underline-offset-2 hover:underline"
            onClick={resendVerification}
            disabled={loading}
          >
            Resend verification
          </button>
          <span className="block mt-1 text-[11px] text-text-muted">
            Email and password accounts only
          </span>
        </p>
        <button type="submit" className="btn-primary btn-block" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {showOAuth && (
        <>
          <AuthDivider />
          <OAuthButtons
            providers={providers}
            disabled={loading}
            callbackUrl={callbackUrl}
            onError={setError}
          />
        </>
      )}

      <p className="auth-footer">
        No account?{" "}
        <Link href={authLinkWithCallback("/sign-up", callbackUrl)}>Create one</Link>
      </p>
    </div>
  );
}

export function SignUpForm({ providers, callbackUrl }: AuthFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const registerRes = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const registerData = await registerRes.json().catch(() => ({}));

    setLoading(false);

    if (!registerRes.ok) {
      setError(registerData.error ?? "Sign up failed");
      return;
    }

    setMessage(
      registerData.message ??
        "Check your email to verify your account, then sign in."
    );
  };

  const showOAuth = providers.length > 0;

  return (
    <div className="auth-form">
      {error && <AuthError message={error} />}
      {message && (
        <p className="border border-border bg-surface px-4 py-3 font-mono text-[13px] text-text-muted">
          {message}{" "}
          <Link href={authLinkWithCallback("/sign-in", callbackUrl)} className="text-text underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}
          after verifying.
        </p>
      )}
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
          <OAuthButtons
            providers={providers}
            disabled={loading}
            callbackUrl={callbackUrl}
            onError={setError}
          />
        </>
      )}

      <p className="auth-footer">
        Already have an account?{" "}
        <Link href={authLinkWithCallback("/sign-in", callbackUrl)}>Sign in</Link>
      </p>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not send reset email");
      return;
    }

    setMessage(data.message ?? "Check your email for a reset link.");
  };

  return (
    <div className="auth-form">
      {error && <AuthError message={error} />}
      {message && (
        <p className="border border-border bg-surface px-4 py-3 font-mono text-[13px] text-text-muted">
          {message}
        </p>
      )}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span className="auth-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={loading || Boolean(message)}
          />
        </label>
        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={loading || Boolean(message)}
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="auth-footer">
        <Link href="/sign-in">Back to sign in</Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not reset password");
      return;
    }

    setDone(true);
  };

  if (!token) {
    return (
      <div className="auth-form">
        <AuthError message="This reset link is invalid. Request a new one from the sign-in page." />
        <p className="auth-footer">
          <Link href="/forgot-password">Request reset link</Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-form">
        <p className="border border-border bg-surface px-4 py-3 font-mono text-[13px] text-text-muted">
          Password updated. You can sign in with your new password.
        </p>
        <p className="auth-footer">
          <Link href="/sign-in">Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-form">
      {error && <AuthError message={error} />}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span className="auth-label">New password</span>
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
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
      <p className="auth-footer">
        <Link href="/forgot-password">Request a new link</Link>
      </p>
    </div>
  );
}
