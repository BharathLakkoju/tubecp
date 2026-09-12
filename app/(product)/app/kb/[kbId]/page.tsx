import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { getPlan } from "@/lib/plans";
import { toKnowledgeBaseSummary } from "@/lib/knowledge-bases";
import { getUserSubscription } from "@/lib/billing/subscription";
import { ensureKbWelcomeMessage } from "@/lib/services/kb-chat";
import UpgradePrompt from "@/components/UpgradePrompt";
import KbChatClient from "./KbChatClient";

export default async function KnowledgeBaseChatPage({
  params,
}: {
  params: Promise<{ kbId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { kbId } = await params;
  const [sub, kb, messages] = await Promise.all([
    getUserSubscription(session.user.id),
    assertKbAccess(kbId, session.user.id),
    ensureKbWelcomeMessage(kbId),
  ]);

  const plan = getPlan(sub.plan);
  if (plan.chatMessagesPerMonth <= 0) {
    return (
      <div className="app-panel">
        <div className="app-panel-scroll">
          <UpgradePrompt
            title="Chat requires Pro"
            description="Upgrade to chat with your knowledge bases using cited transcript sources."
          />
        </div>
      </div>
    );
  }

  return <KbChatClient kb={toKnowledgeBaseSummary(kb)} initialMessages={messages} />;
}
