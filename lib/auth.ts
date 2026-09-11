import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isE2eAuthBypass } from "@/lib/e2e";
import { KbAccessError } from "@/lib/kb-access";

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
  return NextResponse.json({ error: fallback, detail: String(err) }, { status: 500 });
}
