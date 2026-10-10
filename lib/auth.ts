import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isE2eAuthBypass } from "@/lib/e2e";
import { isDevelopment } from "@/lib/env";
import { PolarSubscriptionError } from "@/lib/billing/polar-subscription";
import { EmailDeliveryError } from "@/lib/email";
import { AdminAccessError } from "@/lib/admin";
import { KbAccessError } from "@/lib/kb-access";
import { ResearchAccessError } from "@/lib/research-access";
import { ResearchSessionError } from "@/lib/research-session";
import { WorkspaceError } from "@/lib/workspaces";

export async function requireUserId(): Promise<string> {
  if (isE2eAuthBypass()) {
    const h = await headers();
    const testUser = h.get("x-e2e-user-id");
    if (!testUser) {
      throw new AuthError("Sign in required");
    }
    return testUser;
  }

  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthError("Sign in required");
  }

  return session.user.id;
}

export class AuthError extends Error {
  code = "AUTH_REQUIRED";
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export function apiError(err: unknown, fallback = "Internal server error") {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 401 });
  }
  if (err instanceof KbAccessError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
  }
  if (err instanceof ResearchAccessError) {
    const status = err.message === "Research not found" ? 404 : 403;
    return NextResponse.json({ error: err.message, code: err.code }, { status });
  }
  if (err instanceof ResearchSessionError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
  }
  if (err instanceof WorkspaceError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
  }
  if (err instanceof AdminAccessError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
  }
  if (err instanceof PolarSubscriptionError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 502 });
  }
  if (err instanceof EmailDeliveryError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 503 });
  }
  if (err && typeof err === "object" && "code" in err) {
    const e = err as { code: string; message: string };
    if (e.code === "USAGE_LIMIT" || e.code === "FEATURE_GATE") {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 403 });
    }
    if (e.code === "RATE_LIMIT") {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 429 });
    }
  }
  console.error(err);
  const body: { error: string; detail?: string } = { error: fallback };
  if (isDevelopment()) {
    body.detail = String(err);
  }
  return NextResponse.json(body, { status: 500 });
}
