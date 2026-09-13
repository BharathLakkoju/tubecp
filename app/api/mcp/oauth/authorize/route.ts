import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMcpOAuthProvider, completeMcpAuthorization } from "@/lib/mcp/oauth/provider";
import {
  parseAuthorizeRequest,
  resolveRedirectUri,
} from "@/lib/mcp/oauth/authorize-params";

export const dynamic = "force-dynamic";

function oauthAuthorizeError(
  redirectUri: string | undefined,
  error: string,
  description: string,
  state?: string
): NextResponse {
  if (redirectUri) {
    try {
      const errorUrl = new URL(redirectUri);
      errorUrl.searchParams.set("error", error);
      errorUrl.searchParams.set("error_description", description);
      if (state) {
        errorUrl.searchParams.set("state", state);
      }
      return NextResponse.redirect(errorUrl);
    } catch {
      // Fall through to JSON error response.
    }
  }

  return NextResponse.json(
    { error, error_description: description },
    { status: error === "server_error" ? 500 : 400 }
  );
}

async function handleAuthorize(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams;
  let parsed;
  let redirectUri: string | undefined;

  try {
    parsed = parseAuthorizeRequest(params);
  } catch (err) {
    const description = err instanceof Error ? err.message : "invalid_request";
    return oauthAuthorizeError(
      params.get("redirect_uri") ?? undefined,
      "invalid_request",
      description,
      params.get("state") ?? undefined
    );
  }

  const provider = getMcpOAuthProvider();
  const client = await provider.clientsStore.getClient(parsed.clientId);

  if (!client) {
    return oauthAuthorizeError(
      parsed.redirectUri || undefined,
      "invalid_client",
      "Unknown client_id",
      parsed.state
    );
  }

  try {
    redirectUri = resolveRedirectUri(client, parsed.redirectUri || undefined);
  } catch (err) {
    const description = err instanceof Error ? err.message : "invalid_redirect_uri";
    return oauthAuthorizeError(parsed.redirectUri || undefined, "invalid_request", description, parsed.state);
  }

  const scopes = parsed.scope?.split(" ").filter(Boolean) ?? [];

  const session = await auth();
  if (!session?.user?.id) {
    const callbackUrl = req.nextUrl.pathname + req.nextUrl.search;
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(signInUrl);
  }

  try {
    const destination = await completeMcpAuthorization({
      userId: session.user.id,
      client,
      params: {
        state: parsed.state,
        scopes,
        codeChallenge: parsed.codeChallenge,
        redirectUri,
        resource: parsed.resource ? new URL(parsed.resource) : undefined,
      },
    });

    return NextResponse.redirect(destination);
  } catch (err) {
    const message = err instanceof Error ? err.message : "authorization_failed";
    return oauthAuthorizeError(redirectUri, "server_error", message, parsed.state);
  }
}

export async function GET(req: NextRequest) {
  try {
    return await handleAuthorize(req);
  } catch (err) {
    console.error("MCP OAuth authorize error:", err);
    const description = err instanceof Error ? err.message : "authorization_failed";
    return NextResponse.json(
      { error: "server_error", error_description: description },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();
    const params = new URLSearchParams();
    for (const [key, value] of body.entries()) {
      if (typeof value === "string") {
        params.set(key, value);
      }
    }

    const url = new URL(req.nextUrl);
    url.search = params.toString();
    return handleAuthorize(new NextRequest(url, { method: "GET" }));
  } catch (err) {
    console.error("MCP OAuth authorize error:", err);
    const description = err instanceof Error ? err.message : "authorization_failed";
    return NextResponse.json(
      { error: "server_error", error_description: description },
      { status: 500 }
    );
  }
}
