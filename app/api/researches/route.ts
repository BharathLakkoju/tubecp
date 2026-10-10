import { NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { toSavedResearchSummary } from "@/lib/researches";
import { listUserSavedResearchRecordsWithKbBackfill } from "@/lib/services/saved-research";

export async function GET() {
  try {
    const userId = await requireUserId();
    const records = await listUserSavedResearchRecordsWithKbBackfill(userId);
    const researches = records
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toSavedResearchSummary);

    return NextResponse.json({ researches });
  } catch (err) {
    return apiError(err);
  }
}
