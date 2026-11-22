import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { resolveKnowledgeBaseBuildStatus, withJobProgress } from "@/lib/kb/progress";
import { readKbBuildHeartbeat } from "@/lib/services/kb-build-lock";
import { getIndexedVideoIdsForKnowledgeBase } from "@/lib/services/knowledge-base";
import { getJobStore, tryGetRun } from "@/lib/pipeline/jobs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await params;
    const kb = await assertKbAccess(kbId, userId);
    const overlaid = await withJobProgress(kb);
    const indexedVideoIds = await getIndexedVideoIdsForKnowledgeBase(kbId);
    const status = await resolveKnowledgeBaseBuildStatus(overlaid);
    const queueRun = await tryGetRun(kbId);
    if (queueRun) {
      try {
        const jobs = await getJobStore().listJobs(kbId);
        const fromJobs = jobs.filter((job) => job.status === "indexed").map((job) => job.videoId);
        if (fromJobs.length > 0) {
          indexedVideoIds.splice(0, indexedVideoIds.length, ...fromJobs);
        }
      } catch (err) {
        console.warn(`Pipeline job list unavailable for ${kbId}:`, err);
      }
    }
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
