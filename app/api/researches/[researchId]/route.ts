import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertResearchAccess } from "@/lib/research-access";
import { backfillSavedResearchesFromKnowledgeBases } from "@/lib/services/saved-research";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ researchId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { researchId } = await params;
    await backfillSavedResearchesFromKnowledgeBases(userId);
    const record = await assertResearchAccess(researchId, userId);
    return NextResponse.json(record);
  } catch (err) {
    return apiError(err);
  }
}
