"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { GithubLogo, GoogleLogo } from "@phosphor-icons/react";
import type { OAuthProviderId } from "@/lib/auth-providers";
import { authLinkWithCallback } from "@/lib/billing/checkout-flow";
import { FormAlert, TextField } from "@/components/tubecp/FormKit";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const linkClass = "text-primary underline underline-offset-2";

function AuthDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="text-label text-muted-foreground">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

const PROVIDER_LABELS: Record<OAuthProviderId, string> = {
  google: "Continue with Google",
  github: "Continue with GitHub",
};

const PROVIDER_ICONS: Record<OAuthProviderId, React.ReactNode> = {
  google: <GoogleLogo data-icon="inline-start" weight="bold" aria-hidden />,
  github: <GithubLogo data-icon="inline-start" weight="bold" aria-hidden />,
};

function SubmitButton({
  loading,
  idle,
  busy,
  disabled,
}: {
  loading: boolean;
  idle: string;
  busy: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full"
      disabled={loading || disabled}
      aria-busy={loading}
    >
      {loading && <Spinner data-icon="inline-start" />}
      {loading ? busy : idle}
    </Button>
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
    <div className="flex flex-col gap-2">
      {providers.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={busy}
          onClick={() => void signInWith(provider)}
        >
          {loadingProvider === provider ? <Spinner data-icon="inline-start" /> : PROVIDER_ICONS[provider]}
          {loadingProvider === provider ? "Connecting..." : PROVIDER_LABELS[provider]}
        </Button>
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
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. If you signed up with email, verify your inbox first.");
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
    setNotice(null);
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
    setNotice("If an unverified account exists for that email, a new verification link was sent.");
  };

  const showOAuth = providers.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {error && <FormAlert kind="error">{error}</FormAlert>}
      {notice && <FormAlert kind="success">{notice}</FormAlert>}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={loading}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          disabled={loading}
        />
        <p className="text-label text-foreground-secondary">
          <Link href="/forgot-password" className={linkClass}>
            Forgot password?
          </Link>
          {" · "}
          <button
            type="button"
            className={`${linkClass} rounded-xs focus-visible:ring-2 focus-visible:ring-ring`}
            onClick={() => void resendVerification()}
            disabled={loading}
          >
            Resend verification
          </button>
          <span className="mt-1 block text-caption text-muted-foreground">
            Email and password accounts only
          </span>
        </p>
        <SubmitButton loading={loading} idle="Sign in" busy="Signing in..." />
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

      <p className="text-center text-body-sm text-foreground-secondary">
        No account?{" "}
        <Link href={authLinkWithCallback("/sign-up", callbackUrl)} className={linkClass}>
          Create one
        </Link>
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
      registerData.message ?? "Check your email to verify your account, then sign in."
    );
  };

  const showOAuth = providers.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {error && <FormAlert kind="error">{error}</FormAlert>}
      {message && (
        <FormAlert kind="success">
          {message}{" "}
          <Link href={authLinkWithCallback("/sign-in", callbackUrl)} className={linkClass}>
            Sign in
          </Link>{" "}
          after verifying.
        </FormAlert>
      )}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          label="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          disabled={loading}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={loading}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          description="At least 8 characters."
          disabled={loading}
        />
        <SubmitButton loading={loading} idle="Create account" busy="Creating account..." />
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

      <p className="text-center text-body-sm text-foreground-secondary">
        Already have an account?{" "}
        <Link href={authLinkWithCallback("/sign-in", callbackUrl)} className={linkClass}>
          Sign in
        </Link>
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
    <div className="flex flex-col gap-4">
      {error && <FormAlert kind="error">{error}</FormAlert>}
      {message && <FormAlert kind="success">{message}</FormAlert>}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={loading || Boolean(message)}
        />
        <SubmitButton
          loading={loading}
          idle="Send reset link"
          busy="Sending..."
          disabled={Boolean(message)}
        />
      </form>
      <p className="text-center text-body-sm text-foreground-secondary">
        <Link href="/sign-in" className={linkClass}>
          Back to sign in
        </Link>
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
      <div className="flex flex-col gap-4">
        <FormAlert kind="error">
          This reset link is invalid. Request a new one from the sign-in page.
        </FormAlert>
        <p className="text-center text-body-sm">
          <Link href="/forgot-password" className={linkClass}>
            Request reset link
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <FormAlert kind="success">
          Password updated. You can sign in with your new password.
        </FormAlert>
        <p className="text-center text-body-sm">
          <Link href="/sign-in" className={linkClass}>
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          description="At least 8 characters."
          disabled={loading}
        />
        <SubmitButton loading={loading} idle="Update password" busy="Updating..." />
      </form>
      <p className="text-center text-body-sm text-foreground-secondary">
        <Link href="/forgot-password" className={linkClass}>
          Request a new link
        </Link>
      </p>
    </div>
  );
}
