import { getAppUrl } from "@/lib/app-url";

/** Public icon URL for MCP/OAuth connector tiles (served from app/icon.svg). */
export function getMcpBrandIconUrl(): string {
  return `${getAppUrl()}/icon.svg`;
}

export function getMcpServerImplementation() {
  return {
    name: "tubecp",
    title: "TubeCP",
    version: "0.2.0",
    description: "Turn YouTube research into knowledge bases you can chat with.",
    websiteUrl: getAppUrl(),
    icons: [
      {
        src: getMcpBrandIconUrl(),
        mimeType: "image/svg+xml",
        sizes: ["32x32", "128x128"],
      },
    ],
  };
}
