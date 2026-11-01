import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { knowledgeBaseBuildStatus } from "@/lib/services/kb-build-job";
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
    const indexedVideoIds = await getIndexedVideoIdsForKnowledgeBase(kbId);
    const status = knowledgeBaseBuildStatus(kb);
    const queueRun = await tryGetRun(kbId);
    if (queueRun) {
      try {
        const store = getJobStore();
        const counts = await store.counts(kbId);
        const jobs = await store.listJobs(kbId);
        const current = jobs.find(
          (job) => job.status === "fetching" || job.status === "embedding" || job.status === "fetched"
        );
        status.totalVideos = counts.total;
        status.processedVideos = counts.processed;
        status.skippedCount = counts.skipped + counts.failed;
        status.progress =
          kb.status === "ready" || kb.status === "failed"
            ? 100
            : counts.total > 0
              ? Math.min(99, Math.round((counts.processed / counts.total) * 100))
              : 0;
        status.currentVideoTitle = current?.title;
        status.updatedAt = (await store.latestActivity(kbId)) ?? queueRun.updatedAt;
        const fromJobs = jobs.filter((job) => job.status === "indexed").map((job) => job.videoId);
        if (fromJobs.length > 0) {
          indexedVideoIds.splice(0, indexedVideoIds.length, ...fromJobs);
        }
      } catch (err) {
        console.warn(`Pipeline job counts unavailable for ${kbId}:`, err);
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
