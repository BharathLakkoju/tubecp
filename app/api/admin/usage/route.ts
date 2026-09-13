import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/auth";
import { requireAdminUserId } from "@/lib/admin";
import { getAdminUsageSummary } from "@/lib/usage/admin-aggregate";
import { getYouTubeQuotaUsage } from "@/lib/usage/youtube-quota";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUserId();

    const date = req.nextUrl.searchParams.get("date") ?? undefined;
    const [summary, youtubeQuota] = await Promise.all([
      getAdminUsageSummary(date ?? new Date().toISOString().slice(0, 10)),
      getYouTubeQuotaUsage(date ?? undefined),
    ]);

    return NextResponse.json({ summary, youtubeQuota });
  } catch (err) {
    return apiError(err);
  }
}
