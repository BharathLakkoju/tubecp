import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { generateMcpApiKey, storeMcpApiKey } from "@/lib/mcp/api-keys";
import { isProduction } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { label } = (await req.json().catch(() => ({}))) as { label?: string };

    const rawKey = generateMcpApiKey();
    await storeMcpApiKey(userId, rawKey);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

    return NextResponse.json({
      key: rawKey,
      label: label?.trim() || "default",
      endpoint: `${appUrl.replace(/\/$/, "")}/api/mcp`,
      note: isProduction()
        ? "Store this key securely — it is shown only once."
        : "Local hosted MCP endpoint — use with Cursor or Claude via HTTP transport.",
    });
  } catch (err) {
    return apiError(err);
  }
}
