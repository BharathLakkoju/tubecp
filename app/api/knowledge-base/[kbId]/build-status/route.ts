import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { knowledgeBaseBuildStatus } from "@/lib/services/kb-build-job";
import { readKbBuildHeartbeat } from "@/lib/services/kb-build-lock";
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
    const status = knowledgeBaseBuildStatus(kb);
    const heartbeat = await readKbBuildHeartbeat(kbId);
    const updatedAtMs = new Date(status.updatedAt).getTime();
    if (heartbeat !== null && heartbeat > updatedAtMs) {
      status.updatedAt = new Date(heartbeat).toISOString();
    }

    return NextResponse.json({
      ...status,
      indexedVideoIds,
    });
  } catch (err) {
    return apiError(err);
  }
}
