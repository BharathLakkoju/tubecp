import { NextResponse } from "next/server";
import { getMcpProtectedResourceMetadata } from "@/lib/mcp/oauth/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const metadata = getMcpProtectedResourceMetadata();
  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
