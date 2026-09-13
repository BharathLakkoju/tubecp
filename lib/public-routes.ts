const PUBLIC_PREFIXES = [
  "/",
  "/pricing",
  "/terms",
  "/privacy",
  "/refund",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/docs",
  "/api/health",
  "/api/mcp",
  "/api/eval/benchmark",
  "/api/webhook/polar",
  "/api/auth",
  "/api/checkout",
  "/.well-known",
];

export function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (route) => route !== "/" && (pathname === route || pathname.startsWith(`${route}/`))
  );
}
