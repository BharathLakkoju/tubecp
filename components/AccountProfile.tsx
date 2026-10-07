"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DownloadSimple, Trash } from "@phosphor-icons/react";
import { useAuthSession } from "@/components/AuthShell";
import WorkspacePanel from "@/components/WorkspacePanel";
import McpHostedPanel from "@/components/McpHostedPanel";
import { FormAlert, SettingsSection, TextField } from "@/components/tubecp/FormKit";
import InlineConfirm from "@/components/tubecp/InlineConfirm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

type PasswordState = "pending" | "available" | "unavailable";

type AccountProfileProps = {
  showTeamWorkspace?: boolean;
};

export default function AccountProfile({ showTeamWorkspace = false }: AccountProfileProps) {
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
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

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
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading account">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-body text-foreground-secondary">You are not signed in.</p>;
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

  const handleExportData = async () => {
    setPrivacyError(null);
    setPrivacyMessage(null);
    const res = await fetch("/api/user/account");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPrivacyError(data.error ?? "Failed to export data");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tubecp-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setPrivacyMessage("Your data export has been downloaded.");
  };

  const handleDeleteAccount = async () => {
    setPrivacyError(null);
    setPrivacyMessage(null);

    const res = await fetch("/api/user/account", { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // InlineConfirm shows thrown errors inline and stays open.
      throw new Error(data.error ?? "Failed to delete account");
    }

    window.location.href = "/";
  };

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Profile">
        <dl className="flex flex-col gap-1">
          <dt className="text-label text-foreground-secondary">Email</dt>
          <dd className="font-mono text-body-sm break-all text-foreground">{user.email}</dd>
        </dl>
      </SettingsSection>

      <SettingsSection title="Display name">
        <form className="flex flex-col gap-4" onSubmit={handleSave}>
          {error && <FormAlert kind="error">{error}</FormAlert>}
          {message && <FormAlert kind="success">{message}</FormAlert>}
          <TextField
            label="Name"
            type="text"
            value={displayName}
            onChange={(e) => setName(e.target.value)}
            placeholder={user.name ?? "Your name"}
            disabled={saving}
          />
          <div>
            <Button type="submit" disabled={saving} aria-busy={saving}>
              {saving && <Spinner data-icon="inline-start" />}
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </SettingsSection>

      {passwordState !== "unavailable" && (
        <SettingsSection title="Password">
          {passwordState === "pending" ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : (
            <>
              <form className="flex flex-col gap-4" onSubmit={handlePasswordChange}>
                {passwordError && <FormAlert kind="error">{passwordError}</FormAlert>}
                {passwordMessage && <FormAlert kind="success">{passwordMessage}</FormAlert>}
                <TextField
                  label="Current password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={passwordSaving}
                />
                <TextField
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  description="At least 8 characters."
                  disabled={passwordSaving}
                />
                <div>
                  <Button type="submit" disabled={passwordSaving} aria-busy={passwordSaving}>
                    {passwordSaving && <Spinner data-icon="inline-start" />}
                    {passwordSaving ? "Updating..." : "Update password"}
                  </Button>
                </div>
              </form>
              <p className="text-body-sm text-foreground-secondary">
                Forgot it?{" "}
                <Link
                  href="/forgot-password"
                  className="text-primary underline underline-offset-2"
                >
                  Reset via email
                </Link>
              </p>
            </>
          )}
        </SettingsSection>
      )}

      {showTeamWorkspace && <WorkspacePanel />}

      <McpHostedPanel />

      <SettingsSection
        title="Privacy"
        description="Download a copy of your account data, or permanently delete your account."
      >
        {privacyError && <FormAlert kind="error">{privacyError}</FormAlert>}
        {privacyMessage && <FormAlert kind="success">{privacyMessage}</FormAlert>}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportData}>
            <DownloadSimple data-icon="inline-start" aria-hidden />
            Export my data
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Delete account"
        description="This permanently removes your profile, subscription data, and knowledge bases."
        danger
      >
        <InlineConfirm
          trigger={(open) => (
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive-subtle hover:text-destructive"
              onClick={open}
            >
              <Trash data-icon="inline-start" aria-hidden />
              Delete account
            </Button>
          )}
          title="Delete your account permanently?"
          description="Your profile, subscription data, and every knowledge base will be removed. This can't be undone."
          confirmLabel="Delete account"
          busyLabel="Deleting..."
          onConfirm={handleDeleteAccount}
        />
      </SettingsSection>
    </div>
  );
}
