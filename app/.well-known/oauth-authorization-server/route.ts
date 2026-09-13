import { NextResponse } from "next/server";
import { getMcpOAuthMetadata } from "@/lib/mcp/oauth/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const metadata = getMcpOAuthMetadata();
  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
