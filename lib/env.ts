/** True when running a production deployment (never enable dev bypasses). */
export function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development" && !isProduction();
}
