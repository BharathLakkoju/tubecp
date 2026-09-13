"use client";

import { useEffect, useState } from "react";
import type { Workspace } from "@/lib/workspaces";

type Member = {
  userId: string;
  role: string;
  joinedAt: string;
};

export default function WorkspacePanel() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("My team");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workspace")
      .then((res) => res.json())
      .then((data) => {
        setWorkspace(data.workspace ?? null);
        setMembers(data.members ?? []);
      })
      .catch(() => {
        setWorkspace(null);
        setMembers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const createWorkspace = async () => {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create workspace");
      return;
    }
    setWorkspace(data.workspace);
    setMembers(data.members ?? []);
    setMessage("Workspace created.");
  };

  const inviteMember = async () => {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to invite member");
      return;
    }
    setMembers(data.members ?? []);
    setEmail("");
    setMessage("Member invited.");
  };

  if (loading) {
    return <p className="font-mono text-[13px] text-text-muted">Loading workspace…</p>;
  }

  if (!workspace) {
    return (
      <div className="border border-border bg-surface p-5">
        <h3 className="font-mono text-sm font-semibold text-text">Team workspace</h3>
        <p className="mt-2 font-mono text-[13px] text-text-muted">
          Requires an active Team subscription. Create a shared workspace with pooled limits for up to
          5 seats.
        </p>
        <label className="mt-4 block font-mono text-xs text-text-muted">
          Workspace name
          <input
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-sm text-text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="button" className="btn-primary mt-4" onClick={createWorkspace}>
          create workspace
        </button>
        {error && <p className="mt-3 font-mono text-[13px] text-accent">{error}</p>}
      </div>
    );
  }

  return (
    <div className="border border-border bg-surface p-5">
      <h3 className="font-mono text-sm font-semibold text-text">{workspace.name}</h3>
      <p className="mt-2 font-mono text-[13px] text-text-muted">
        Team plan · {workspace.memberCount}/{workspace.seatLimit} seats · pooled usage
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="border border-border px-3 py-2">
          <p className="font-mono text-[11px] text-text-muted">KB builds</p>
          <p className="font-mono text-sm text-text">{workspace.kbBuildsUsed}</p>
        </div>
        <div className="border border-border px-3 py-2">
          <p className="font-mono text-[11px] text-text-muted">Chats</p>
          <p className="font-mono text-sm text-text">{workspace.chatMessagesUsed}</p>
        </div>
        <div className="border border-border px-3 py-2">
          <p className="font-mono text-[11px] text-text-muted">Research today</p>
          <p className="font-mono text-sm text-text">{workspace.researchUsedToday}</p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border border border-border">
        {members.map((member) => (
          <li key={member.userId} className="px-3 py-2 font-mono text-[12px] text-text-muted">
            {member.userId} · {member.role}
          </li>
        ))}
      </ul>

      {workspace.ownerUserId && (
        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <input
            className="flex-1 border border-border bg-bg px-3 py-2 font-mono text-sm text-text"
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="button" className="btn-ghost" onClick={inviteMember}>
            invite member
          </button>
        </div>
      )}

      {message && <p className="mt-3 font-mono text-[13px] text-success">{message}</p>}
      {error && <p className="mt-3 font-mono text-[13px] text-accent">{error}</p>}
    </div>
  );
}
