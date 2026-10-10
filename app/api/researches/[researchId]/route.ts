import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertResearchAccess } from "@/lib/research-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ researchId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { researchId } = await params;
    const record = await assertResearchAccess(researchId, userId);
    return NextResponse.json(record);
  } catch (err) {
    return apiError(err);
  }
}
