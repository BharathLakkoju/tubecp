import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMcpOAuthProvider, completeMcpAuthorization } from "@/lib/mcp/oauth/provider";
import {
  parseAuthorizeRequest,
  resolveRedirectUri,
} from "@/lib/mcp/oauth/authorize-params";

export const dynamic = "force-dynamic";

async function handleAuthorize(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams;
  const parsed = parseAuthorizeRequest(params);
  const provider = getMcpOAuthProvider();
  const client = await provider.clientsStore.getClient(parsed.clientId);

  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }

  const redirectUri = resolveRedirectUri(client, parsed.redirectUri || undefined);
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
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set("error", "server_error");
    errorUrl.searchParams.set("error_description", message);
    if (parsed.state) {
      errorUrl.searchParams.set("state", parsed.state);
    }
    return NextResponse.redirect(errorUrl);
  }
}

export async function GET(req: NextRequest) {
  return handleAuthorize(req);
}

export async function POST(req: NextRequest) {
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
}
