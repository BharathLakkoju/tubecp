import { NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { withJobProgress } from "@/lib/kb/progress";
import { toKnowledgeBaseSummary } from "@/lib/knowledge-bases";
import { listUserKnowledgeBaseRecords } from "@/lib/store";

export async function GET() {
  try {
    const userId = await requireUserId();
    const records = await listUserKnowledgeBaseRecords(userId);
    const knowledgeBases = await Promise.all(
      records.map(async (record) =>
        toKnowledgeBaseSummary(
          record.status === "building" || record.status === "finalizing"
            ? await withJobProgress(record)
            : record
        )
      )
    );

    return NextResponse.json({ knowledgeBases });
  } catch (err) {
    return apiError(err);
  }
}
