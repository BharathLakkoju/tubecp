import { revokePolarSubscription } from "@/lib/billing/polar-subscription";
import { getUserSubscription } from "@/lib/billing/subscription";
import { createDbPool } from "@/lib/db";
import { revokeAllMcpApiKeys } from "@/lib/mcp/api-keys";
import { deleteKnowledgeBase } from "@/lib/services/knowledge-base";
import { exportKnowledgeBaseSummary } from "@/lib/services/kb-export";
import { getUserApiUsage } from "@/lib/usage/api-cost";
import { listUserKnowledgeBaseRecords } from "@/lib/store";
import { getUserById } from "@/lib/users";

export async function exportUserData(userId: string) {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const [subscription, knowledgeBases, apiUsage] = await Promise.all([
    getUserSubscription(userId),
    listUserKnowledgeBaseRecords(userId),
    getUserApiUsage(userId),
  ]);

  const knowledgeBaseExports = await Promise.all(
    knowledgeBases.map((kb) => exportKnowledgeBaseSummary(kb))
  );

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified?.toISOString() ?? null,
    },
    subscription: {
      plan: subscription.plan,
      status: subscription.status,
      kbBuildsUsed: subscription.kbBuildsUsed,
      chatMessagesUsed: subscription.chatMessagesUsed,
      researchUsedToday: subscription.researchUsedToday,
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd,
    },
    apiUsage,
    knowledgeBases: knowledgeBaseExports,
  };
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const subscription = await getUserSubscription(userId);
  if (subscription.polarSubscriptionId) {
    await revokePolarSubscription(subscription.polarSubscriptionId);
  }

  const knowledgeBases = await listUserKnowledgeBaseRecords(userId);
  for (const kb of knowledgeBases) {
    await deleteKnowledgeBase(kb.kbId, userId);
  }

  await revokeAllMcpApiKeys(userId);

  const pool = createDbPool();
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
}
