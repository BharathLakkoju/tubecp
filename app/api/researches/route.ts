import { NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { toSavedResearchSummary } from "@/lib/researches";
import { listUserSavedResearchRecords } from "@/lib/store";

export async function GET() {
  try {
    const userId = await requireUserId();
    const records = await listUserSavedResearchRecords(userId);
    const researches = records
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toSavedResearchSummary);

    return NextResponse.json({ researches });
  } catch (err) {
    return apiError(err);
  }
}
