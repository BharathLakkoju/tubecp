import { NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { listUserKnowledgeBaseRecords } from "@/lib/store";

export async function GET() {
  try {
    const userId = await requireUserId();
    const records = await listUserKnowledgeBaseRecords(userId);

    const items = records
      .filter((record) => (record.rankedVideos?.length ?? 0) > 0)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 25)
      .map((record) => ({
        kbId: record.kbId,
        topic: record.topic,
        status: record.status,
        createdAt: record.createdAt,
        transcriptMode: record.buildOptions?.transcriptMode ?? "captions",
        rankedVideos: record.rankedVideos!,
      }));

    return NextResponse.json({ items });
  } catch (err) {
    return apiError(err);
  }
}
