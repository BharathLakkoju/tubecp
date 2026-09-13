import { redirect } from "next/navigation";
import { assertKbAccess } from "@/lib/kb-access";
import { getPlan } from "@/lib/plans";
import { toKnowledgeBaseSummary } from "@/lib/knowledge-bases";
import { getProductBootstrap } from "@/lib/server/product-bootstrap";
import { ensureKbWelcomeMessage } from "@/lib/services/kb-chat";
import UpgradePrompt from "@/components/UpgradePrompt";
import KbFailedPanel from "@/components/KbFailedPanel";
import KbChatClient from "./KbChatClient";

export default async function KnowledgeBaseChatPage({
  params,
}: {
  params: Promise<{ kbId: string }>;
}) {
  const bootstrap = await getProductBootstrap();
  const userId = bootstrap.session?.user?.id;

  if (!userId) {
    redirect("/sign-in");
  }

  const { kbId } = await params;
  const [kb, messages] = await Promise.all([
    assertKbAccess(kbId, userId),
    ensureKbWelcomeMessage(kbId),
  ]);

  if (kb.status === "failed") {
    return <KbFailedPanel kb={toKnowledgeBaseSummary(kb)} />;
  }

  const plan = getPlan(bootstrap.subscription.plan);
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
