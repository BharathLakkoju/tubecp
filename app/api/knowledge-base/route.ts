import { NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { toKnowledgeBaseSummary } from "@/lib/knowledge-bases";
import { listUserKnowledgeBaseRecords } from "@/lib/store";

export async function GET() {
  try {
    const userId = await requireUserId();
    const records = await listUserKnowledgeBaseRecords(userId);
    const knowledgeBases = records.map(toKnowledgeBaseSummary);

    return NextResponse.json({ knowledgeBases });
  } catch (err) {
    return apiError(err);
  }
}
