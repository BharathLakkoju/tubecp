import { createDbPool } from "@/lib/db";
import { isMissingRelationError } from "@/lib/db/postgres-errors";
import { isE2eAuthBypass } from "@/lib/e2e";
import { getPlan, type PlanId } from "@/lib/plans";
import {
  getUserSubscription,
  isSubscriptionUsable,
  type UserSubscription,
} from "@/lib/billing/subscription";

export type WorkspaceRole = "owner" | "admin" | "member";

export class WorkspaceError extends Error {
  code = "WORKSPACE_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "WorkspaceError";
  }
}

export type Workspace = {
  id: string;
  name: string;
  ownerUserId: string;
  plan: PlanId;
  seatLimit: number;
  memberCount: number;
  kbBuildsUsed: number;
  chatMessagesUsed: number;
  researchUsedToday: number;
};

export type WorkspaceMember = {
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
};

const memoryWorkspaces = new Map<string, Workspace & { members: WorkspaceMember[] }>();

function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL) && !isE2eAuthBypass();
}

function teamPlanLimits() {
  return getPlan("team");
}

function parseDbUserId(userId: string): number {
  const id = Number.parseInt(userId, 10);
  if (!Number.isFinite(id)) {
    throw new WorkspaceError("Invalid user account");
  }
  return id;
}

export async function getUserWorkspace(userId: string): Promise<Workspace | null> {
  if (!usePostgres()) {
    for (const workspace of memoryWorkspaces.values()) {
      if (workspace.members.some((member) => member.userId === userId)) {
        return {
          id: workspace.id,
          name: workspace.name,
          ownerUserId: workspace.ownerUserId,
          plan: workspace.plan,
          seatLimit: workspace.seatLimit,
          memberCount: workspace.members.length,
          kbBuildsUsed: workspace.kbBuildsUsed,
          chatMessagesUsed: workspace.chatMessagesUsed,
          researchUsedToday: workspace.researchUsedToday,
        };
      }
    }
    return null;
  }

  const pool = createDbPool();
  try {
    const result = await pool.query(
      `SELECT w.id, w.name, w.owner_user_id, w.plan, w.seat_limit,
              w.kb_builds_used, w.chat_messages_used, w.research_used_today,
              COUNT(m.user_id)::int AS member_count
       FROM workspaces w
       JOIN workspace_members m ON m.workspace_id = w.id
       JOIN workspace_members mine ON mine.workspace_id = w.id AND mine.user_id = $1
       GROUP BY w.id`,
      [userId]
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: String(row.id),
      name: row.name,
      ownerUserId: String(row.owner_user_id),
      plan: row.plan as PlanId,
      seatLimit: row.seat_limit,
      memberCount: row.member_count,
      kbBuildsUsed: row.kb_builds_used,
      chatMessagesUsed: row.chat_messages_used,
      researchUsedToday: row.research_used_today,
    };
  } catch (err) {
    if (isMissingRelationError(err, "workspaces")) {
      console.warn(
        "[workspaces] Table missing — run npm run db:migrate to enable team workspaces."
      );
      return null;
    }
    throw err;
  }
}

async function assertTeamSubscription(userId: string): Promise<void> {
  const sub = await getUserSubscription(userId);
  if (sub.plan !== "team" || !isSubscriptionUsable(sub)) {
    throw new WorkspaceError(
      "Team workspace requires an active Team subscription. Upgrade at /pricing?plan=team."
    );
  }
}

export async function createWorkspace(userId: string, name: string): Promise<Workspace> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new WorkspaceError("Workspace name is required");
  }

  await assertTeamSubscription(userId);

  const existing = await getUserWorkspace(userId);
  if (existing) {
    throw new WorkspaceError("You already belong to a workspace");
  }

  if (!usePostgres()) {
    const id = `ws_${Date.now()}`;
    const workspace = {
      id,
      name: trimmed,
      ownerUserId: userId,
      plan: "team" as PlanId,
      seatLimit: teamPlanLimits().seatLimit ?? 5,
      memberCount: 1,
      kbBuildsUsed: 0,
      chatMessagesUsed: 0,
      researchUsedToday: 0,
      members: [{ userId, role: "owner" as WorkspaceRole, joinedAt: new Date().toISOString() }],
    };
    memoryWorkspaces.set(id, workspace);
    return workspace;
  }

  const pool = createDbPool();
  const dbUserId = parseDbUserId(userId);
  const seatLimit = teamPlanLimits().seatLimit ?? 5;

  try {
    const created = await pool.query(
      `WITH new_workspace AS (
         INSERT INTO workspaces (name, owner_user_id, plan, seat_limit)
         VALUES ($1, $2, 'team', $3)
         RETURNING id, name, owner_user_id, plan, seat_limit, kb_builds_used, chat_messages_used, research_used_today
       ),
       inserted_member AS (
         INSERT INTO workspace_members (workspace_id, user_id, role)
         SELECT id, $2, 'owner' FROM new_workspace
         RETURNING workspace_id
       )
       SELECT * FROM new_workspace`,
      [trimmed, dbUserId, seatLimit]
    );

    const row = created.rows[0];
    if (!row) {
      throw new WorkspaceError("Failed to create workspace");
    }

    return {
      id: String(row.id),
      name: row.name,
      ownerUserId: String(row.owner_user_id),
      plan: row.plan as PlanId,
      seatLimit: row.seat_limit,
      memberCount: 1,
      kbBuildsUsed: row.kb_builds_used,
      chatMessagesUsed: row.chat_messages_used,
      researchUsedToday: row.research_used_today,
    };
  } catch (err) {
    if (isMissingRelationError(err, "workspaces")) {
      throw new WorkspaceError(
        "Team workspaces are not enabled on this database yet. Run npm run db:migrate."
      );
    }
    throw err;
  }
}

export async function addWorkspaceMember(
  ownerUserId: string,
  email: string
): Promise<WorkspaceMember> {
  const workspace = await getUserWorkspace(ownerUserId);
  if (!workspace || workspace.ownerUserId !== ownerUserId) {
    throw new WorkspaceError("Only the workspace owner can invite members");
  }

  if (workspace.memberCount >= workspace.seatLimit) {
    throw new WorkspaceError(`Seat limit reached (${workspace.seatLimit})`);
  }

  if (!usePostgres()) {
    const stored = memoryWorkspaces.get(workspace.id);
    if (!stored) throw new WorkspaceError("Workspace not found");

    const memberUserId = `user_${email.toLowerCase()}`;
    if (stored.members.some((member) => member.userId === memberUserId)) {
      throw new WorkspaceError("Member already in workspace");
    }

    const member = {
      userId: memberUserId,
      role: "member" as WorkspaceRole,
      joinedAt: new Date().toISOString(),
    };
    stored.members.push(member);
    stored.memberCount = stored.members.length;
    return member;
  }

  const pool = createDbPool();
  const userResult = await pool.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [
    email.toLowerCase().trim(),
  ]);
  const invitee = userResult.rows[0];
  if (!invitee) {
    throw new WorkspaceError("No account found for that email — they must sign up first");
  }

  const inviteeId = String(invitee.id);
  const existingWorkspace = await getUserWorkspace(inviteeId);
  if (existingWorkspace) {
    throw new WorkspaceError("That user already belongs to a workspace");
  }

  await pool.query(
    `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'member')`,
    [workspace.id, inviteeId]
  );

  return {
    userId: inviteeId,
    role: "member",
    joinedAt: new Date().toISOString(),
  };
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  if (!usePostgres()) {
    return memoryWorkspaces.get(workspaceId)?.members ?? [];
  }

  const pool = createDbPool();
  const result = await pool.query(
    `SELECT user_id, role, joined_at FROM workspace_members WHERE workspace_id = $1 ORDER BY joined_at`,
    [workspaceId]
  );

  return result.rows.map((row) => ({
    userId: String(row.user_id),
    role: row.role as WorkspaceRole,
    joinedAt: row.joined_at.toISOString(),
  }));
}

export type WorkspaceUsageType = "research" | "kb_build" | "chat";

export async function incrementWorkspaceUsage(
  workspaceId: string,
  type: WorkspaceUsageType
): Promise<void> {
  if (!usePostgres()) {
    const workspace = memoryWorkspaces.get(workspaceId);
    if (!workspace) return;
    if (type === "research") workspace.researchUsedToday += 1;
    if (type === "kb_build") workspace.kbBuildsUsed += 1;
    if (type === "chat") workspace.chatMessagesUsed += 1;
    return;
  }

  const column =
    type === "research"
      ? "research_used_today"
      : type === "kb_build"
        ? "kb_builds_used"
        : "chat_messages_used";

  const pool = createDbPool();
  await pool.query(
    `UPDATE workspaces SET ${column} = ${column} + 1, updated_at = NOW() WHERE id = $1`,
    [workspaceId]
  );
}

/** Pool workspace usage counters for users on an active Team plan. */
export function applyWorkspaceSubscription(
  sub: UserSubscription,
  workspace: Workspace | null
): UserSubscription {
  if (!workspace || sub.plan !== "team" || !isSubscriptionUsable(sub)) {
    return sub;
  }

  return {
    ...sub,
    kbBuildsUsed: workspace.kbBuildsUsed,
    chatMessagesUsed: workspace.chatMessagesUsed,
    researchUsedToday: workspace.researchUsedToday,
  };
}
