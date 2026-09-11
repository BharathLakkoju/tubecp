import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isE2eAuthBypass } from "@/lib/e2e";

const PUBLIC_PREFIXES = [
  "/",
  "/pricing",
  "/terms",
  "/privacy",
  "/refund",
  "/sign-in",
  "/sign-up",
  "/api/health",
  "/api/webhook/polar",
  "/api/auth",
];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (route) => route !== "/" && (pathname === route || pathname.startsWith(`${route}/`))
  );
}

export async function proxy(request: NextRequest) {
  if (isE2eAuthBypass()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.user?.id) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Sign in required", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
