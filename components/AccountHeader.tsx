"use client";

import { AppSignOutButton } from "@/components/AuthShell";

export default function AccountHeader() {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 className="font-mono text-lg font-semibold text-text">Account</h1>
        <p className="mt-1 font-mono text-[13px] text-text-muted">
          Manage your profile, security, and connected accounts.
        </p>
      </div>
      <AppSignOutButton className="btn-ghost shrink-0" />
    </header>
  );
}
