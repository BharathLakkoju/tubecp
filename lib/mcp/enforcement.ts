import {
  checkAndIncrementUsage,
  getUserSubscription,
  type UsageType,
} from "@/lib/billing/subscription";
import { assertKbAccess } from "@/lib/kb-access";
import type { PlanId } from "@/lib/plans";

export class McpEnforcementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpEnforcementError";
  }
}

export function requireBillableMcpUser(userId: string): void {
  if (userId === "service") {
    throw new McpEnforcementError(
      "This tool requires a per-user MCP API key. Generate one in Account → Hosted MCP."
    );
  }
}

export async function mcpGetUserPlan(userId: string): Promise<PlanId> {
  requireBillableMcpUser(userId);
  const sub = await getUserSubscription(userId);
  return sub.plan;
}

export async function mcpConsumeUsage(userId: string, type: UsageType): Promise<void> {
  requireBillableMcpUser(userId);
  await checkAndIncrementUsage(userId, type);
}

export async function mcpAssertKbAccess(kbId: string, userId: string): Promise<void> {
  requireBillableMcpUser(userId);
  await assertKbAccess(kbId, userId);
}
