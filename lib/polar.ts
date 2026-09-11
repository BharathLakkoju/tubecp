import { Polar } from "@polar-sh/sdk";

export function getPolarServer(): "sandbox" | "production" {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

export function getPolarClient(): Polar {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("POLAR_ACCESS_TOKEN is not configured");
  }
  return new Polar({
    accessToken,
    server: getPolarServer(),
  });
}

export { getAppUrl } from "@/lib/app-url";
