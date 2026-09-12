import { NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { listUserKnowledgeBaseRecords } from "@/lib/store";
import type { KnowledgeBase } from "@/lib/types";

export async function GET() {
  try {
    const userId = await requireUserId();
    const records = await listUserKnowledgeBaseRecords(userId);

    const knowledgeBases: KnowledgeBase[] = records.map((kb) => ({
      kbId: kb.kbId,
      topic: kb.topic,
      videoIds: kb.videoIds,
      chunksIndexed: kb.chunksIndexed,
      videosIndexed: kb.videosIndexed,
      totalMinutes: kb.totalMinutes,
      status: kb.status,
      createdAt: kb.createdAt,
    }));

    return NextResponse.json({ knowledgeBases });
  } catch (err) {
    return apiError(err);
  }
}
