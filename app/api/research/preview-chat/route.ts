import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { getUserSubscription } from "@/lib/billing/subscription";
import { buildResearchPreview } from "@/lib/services/research-preview";
import { rateLimitApi } from "@/lib/ratelimit";
import type { RankedVideo } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "research-preview", 10);

    const sub = await getUserSubscription(userId);
    if (sub.plan !== "free") {
      return NextResponse.json(
        { error: "Preview chat is only available on the free tier" },
        { status: 400 }
      );
    }

    const { topic, rankedVideos } = (await req.json()) as {
      topic?: string;
      rankedVideos?: RankedVideo[];
    };

    if (!topic?.trim() || !rankedVideos?.length) {
      return NextResponse.json({ error: "topic and rankedVideos are required" }, { status: 400 });
    }

    const preview = await buildResearchPreview(topic.trim(), rankedVideos);
    if (!preview) {
      return NextResponse.json({ error: "No preview available" }, { status: 404 });
    }

    return NextResponse.json({ preview });
  } catch (err) {
    return apiError(err);
  }
}
