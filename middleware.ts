import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isE2eAuthBypass } from "@/lib/e2e";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/terms",
  "/privacy",
  "/refund",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/webhook/polar",
]);

const clerk = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default isE2eAuthBypass()
  ? function middleware() {
      return NextResponse.next();
    }
  : clerk;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
