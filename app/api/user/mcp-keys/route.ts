import { NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { getMcpEndpoint } from "@/lib/mcp/endpoint";

export async function GET() {
  try {
    await requireUserId();

    return NextResponse.json({
      endpoint: getMcpEndpoint(),
      auth: "oauth",
      docs: "/docs/mcp",
    });
  } catch (err) {
    return apiError(err);
  }
}
