"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthSession } from "@/components/AuthShell";
import LoadingSpinner from "@/components/LoadingSpinner";

type PasswordState = "pending" | "available" | "unavailable";

export default function AccountProfile() {
  const { data: session, status, update } = useAuthSession();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordState, setPasswordState] = useState<PasswordState>("pending");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const user = session?.user;

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  useEffect(() => {
    if (!user) {
      setPasswordState("unavailable");
      return;
    }

    setPasswordState("pending");
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        setPasswordState(data.hasPassword ? "available" : "unavailable");
      })
      .catch(() => setPasswordState("unavailable"));
  }, [user]);

  if (status === "loading") {
    return <LoadingSpinner label="Loading account..." />;
  }

  if (!user) {
    return (
      <p className="font-mono text-[13px] text-text-muted">
        You are not signed in.
      </p>
    );
  }

  const displayName = name || user.name || "";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: displayName.trim() }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update profile");
      return;
    }

    const data = await res.json().catch(() => ({}));
    const savedName = typeof data.name === "string" ? data.name : displayName.trim();
    setName(savedName);
    await update({ user: { name: savedName } });
    setMessage("Profile updated.");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordMessage(null);

    const res = await fetch("/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json().catch(() => ({}));
    setPasswordSaving(false);

    if (!res.ok) {
      setPasswordError(data.error ?? "Failed to update password");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setPasswordMessage(data.message ?? "Password updated.");
  };

  return (
    <div className="auth-profile">
      <section className="auth-profile-section">
        <h2 className="auth-profile-title">Profile</h2>
        <dl className="auth-profile-meta">
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
      </section>

      <section className="auth-profile-section">
        <h2 className="auth-profile-title">Display name</h2>
        <form className="auth-form" onSubmit={handleSave}>
          {error && (
            <p className="border border-red-500/40 bg-red-500/10 px-4 py-3 font-mono text-[13px] text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {message && (
            <p className="border border-border bg-surface px-4 py-3 font-mono text-[13px] text-text-muted">
              {message}
            </p>
          )}
          <label className="auth-field">
            <span className="auth-label">Name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setName(e.target.value)}
              placeholder={user.name ?? "Your name"}
              disabled={saving}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Saving...
              </span>
            ) : (
              "Save changes"
            )}
          </button>
        </form>
      </section>

      {passwordState !== "unavailable" && (
        <section className="auth-profile-section">
          <h2 className="auth-profile-title">Password</h2>
          {passwordState === "pending" ? (
            <LoadingSpinner size="sm" label="Loading password settings..." />
          ) : (
            <>
              <form className="auth-form" onSubmit={handlePasswordChange}>
                {passwordError && (
                  <p className="border border-red-500/40 bg-red-500/10 px-4 py-3 font-mono text-[13px] text-red-600 dark:text-red-400">
                    {passwordError}
                  </p>
                )}
                {passwordMessage && (
                  <p className="border border-border bg-surface px-4 py-3 font-mono text-[13px] text-text-muted">
                    {passwordMessage}
                  </p>
                )}
                <label className="auth-field">
                  <span className="auth-label">Current password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={passwordSaving}
                  />
                </label>
                <label className="auth-field">
                  <span className="auth-label">New password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={passwordSaving}
                  />
                </label>
                <button type="submit" className="btn-primary" disabled={passwordSaving}>
                  {passwordSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Updating...
                    </span>
                  ) : (
                    "Update password"
                  )}
                </button>
              </form>
              <p className="mt-4 font-mono text-[13px] text-text-muted">
                Signed out?{" "}
                <Link href="/forgot-password" className="text-text underline-offset-2 hover:underline">
                  Reset via email
                </Link>
                .
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
