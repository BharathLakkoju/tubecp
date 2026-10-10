import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { knowledgeBaseBuildStatus } from "@/lib/services/kb-build-job";
import { getIndexedVideoIdsForKnowledgeBase } from "@/lib/services/knowledge-base";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await params;
    const kb = await assertKbAccess(kbId, userId);
    const indexedVideoIds = await getIndexedVideoIdsForKnowledgeBase(kbId);

    return NextResponse.json({
      ...knowledgeBaseBuildStatus(kb),
      indexedVideoIds,
    });
  } catch (err) {
    return apiError(err);
  }
}
