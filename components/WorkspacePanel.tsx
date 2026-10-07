"use client";

import { useEffect, useState } from "react";
import StatTile from "@/components/tubecp/StatTile";
import { FormAlert, SettingsSection, TextField } from "@/components/tubecp/FormKit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  const feedback = (
    <>
      {message && <FormAlert kind="success">{message}</FormAlert>}
      {error && <FormAlert kind="error">{error}</FormAlert>}
    </>
  );

  if (!workspace) {
    return (
      <SettingsSection
        title="Team workspace"
        description="Requires an active Team subscription. Create a shared workspace with pooled limits for up to 5 seats."
      >
        <TextField label="Workspace name" value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <Button onClick={createWorkspace}>Create workspace</Button>
        </div>
        {feedback}
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title={workspace.name}
      description={
        <>
          Team plan ·{" "}
          <span className="font-mono tabular-nums">
            {workspace.memberCount}/{workspace.seatLimit}
          </span>{" "}
          seats · pooled usage
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="KB builds" value={workspace.kbBuildsUsed} />
        <StatTile label="Chats" value={workspace.chatMessagesUsed} />
        <StatTile label="Research today" value={workspace.researchUsedToday} />
      </div>

      <ul className="divide-y overflow-hidden rounded-lg border" aria-label="Workspace members">
        {members.map((member) => (
          <li
            key={member.userId}
            className="flex items-center justify-between gap-3 px-3 py-2 text-label text-foreground-secondary"
          >
            <span className="min-w-0 truncate font-mono">{member.userId}</span>
            <span className="shrink-0">{member.role}</span>
          </li>
        ))}
      </ul>

      {workspace.ownerUserId && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <TextField
            className="flex-1"
            label="Invite by email"
            type="email"
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button variant="outline" onClick={inviteMember}>
            Invite member
          </Button>
        </div>
      )}

      {feedback}
    </SettingsSection>
  );
}
