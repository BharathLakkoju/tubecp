import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { deleteKnowledgeBase } from "@/lib/services/knowledge-base";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await params;
    const kb = await assertKbAccess(kbId, userId);
    return NextResponse.json(kb);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await params;
    await assertKbAccess(kbId, userId);
    await deleteKnowledgeBase(kbId, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
