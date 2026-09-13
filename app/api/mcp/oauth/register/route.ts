import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { OAuthClientMetadataSchema } from "@modelcontextprotocol/sdk/shared/auth.js";
import { mcpOAuthClientsStore } from "@/lib/mcp/oauth/clients-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!mcpOAuthClientsStore.registerClient) {
    return NextResponse.json({ error: "registration_not_supported" }, { status: 501 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
  }

  const parsed = OAuthClientMetadataSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: parsed.error.message },
      { status: 400 }
    );
  }

  const clientMetadata = parsed.data;
  const isPublicClient = clientMetadata.token_endpoint_auth_method === "none";
  const clientSecret = isPublicClient ? undefined : crypto.randomBytes(32).toString("hex");
  const clientIdIssuedAt = Math.floor(Date.now() / 1000);

  const registered = await mcpOAuthClientsStore.registerClient({
    ...clientMetadata,
    client_secret: clientSecret,
    client_secret_expires_at: isPublicClient ? undefined : clientIdIssuedAt + 60 * 60 * 24 * 30,
  });

  return NextResponse.json(registered, {
    status: 201,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
