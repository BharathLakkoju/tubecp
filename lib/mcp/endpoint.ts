import { getAppUrl } from "@/lib/app-url";

export function getMcpEndpoint(): string {
  return `${getAppUrl()}/api/mcp`;
}
