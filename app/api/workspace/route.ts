import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import {
  createWorkspace,
  getUserWorkspace,
  listWorkspaceMembers,
} from "@/lib/workspaces";

export async function GET() {
  try {
    const userId = await requireUserId();
    const workspace = await getUserWorkspace(userId);
    if (!workspace) {
      return NextResponse.json({ workspace: null });
    }

    const members = await listWorkspaceMembers(workspace.id);
    return NextResponse.json({ workspace, members });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { name } = (await req.json()) as { name?: string };
    const workspace = await createWorkspace(userId, name ?? "My team");
    const members = await listWorkspaceMembers(workspace.id);
    return NextResponse.json({ workspace, members });
  } catch (err) {
    return apiError(err);
  }
}
