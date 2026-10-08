import { redirect } from "next/navigation";
import { assertKbAccess } from "@/lib/kb-access";
import { getPlan } from "@/lib/plans";
import { toKnowledgeBaseSummary } from "@/lib/knowledge-bases";
import { getProductBootstrap } from "@/lib/server/product-bootstrap";
import { repairKnowledgeBaseIfIndexed } from "@/lib/services/kb-build-job";
import { ensureKbWelcomeMessage } from "@/lib/services/kb-chat";
import UpgradePrompt from "@/components/UpgradePrompt";
import AppPage from "@/components/tubecp/AppPage";
import KbFailedPanel from "@/components/KbFailedPanel";
import KbBuildingPanel from "@/components/KbBuildingPanel";
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
  const plan = getPlan(bootstrap.subscription.plan);

  let kb = await assertKbAccess(kbId, userId);
  const repaired = await repairKnowledgeBaseIfIndexed(kbId, plan.persistentKbs);
  if (repaired) {
    kb = repaired;
  }

  if (kb.status === "failed") {
    return <KbFailedPanel kb={toKnowledgeBaseSummary(kb)} />;
  }

  if (kb.status === "building") {
    return <KbBuildingPanel kb={toKnowledgeBaseSummary(kb)} />;
  }

  const messages = await ensureKbWelcomeMessage(kbId);

  if (plan.chatMessagesPerMonth <= 0) {
    return (
      <AppPage width="reading">
        <UpgradePrompt
          title="Chat requires Pro"
          description="Upgrade to chat with your knowledge bases using cited transcript sources."
          className="mt-6"
        />
      </AppPage>
    );
  }

  return <KbChatClient kb={toKnowledgeBaseSummary(kb)} initialMessages={messages} />;
}
