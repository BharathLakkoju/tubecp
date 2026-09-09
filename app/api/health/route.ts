import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { hasKv } from "@/lib/store";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    hasYoutubeKey: Boolean(config.youtubeApiKey),
    hasOpenRouterKey: Boolean(config.openrouterApiKey),
    hasKv: hasKv(),
    platform: "vercel-serverless",
  });
}
