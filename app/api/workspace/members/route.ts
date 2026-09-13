import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { addWorkspaceMember, getUserWorkspace, listWorkspaceMembers } from "@/lib/workspaces";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { email } = (await req.json()) as { email?: string };

    if (!email?.trim()) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const member = await addWorkspaceMember(userId, email.trim());
    const workspace = await getUserWorkspace(userId);
    const members = workspace ? await listWorkspaceMembers(workspace.id) : [];

    return NextResponse.json({ member, members });
  } catch (err) {
    return apiError(err);
  }
}
