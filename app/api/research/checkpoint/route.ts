import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { getResearchCheckpoint } from "@/lib/research-session";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const researchSessionId = req.nextUrl.searchParams.get("researchSessionId");

    if (!researchSessionId?.trim()) {
      return NextResponse.json({ error: "researchSessionId is required" }, { status: 400 });
    }

    const checkpoint = await getResearchCheckpoint(userId, researchSessionId);
    if (!checkpoint) {
      return NextResponse.json({ checkpoint: null });
    }

    return NextResponse.json({ checkpoint, resumable: checkpoint.stage !== "ranked" });
  } catch (err) {
    return apiError(err);
  }
}
