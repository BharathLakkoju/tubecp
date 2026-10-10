import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { assertResearchAccess } from "@/lib/research-access";
import { getKnowledgeBase } from "@/lib/store";
import { knowledgeBaseIdFromResearchId } from "@/lib/researches";
import ResearchDetailClient from "./ResearchDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ researchId: string }>;
}) {
  const { researchId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return { title: "Research" };
  }

  try {
    const record = await assertResearchAccess(researchId, session.user.id);
    return { title: record.topic };
  } catch {
    return { title: "Research" };
  }
}

export default async function ResearchDetailPage({
  params,
}: {
  params: Promise<{ researchId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const { researchId } = await params;

  const kbId = knowledgeBaseIdFromResearchId(researchId);
  if (kbId) {
    const kb = await getKnowledgeBase(kbId);
    if (kb && kb.userId === session.user.id) {
      redirect(`/app/kb/${kbId}`);
    }
  }

  try {
    const record = await assertResearchAccess(researchId, session.user.id);
    return <ResearchDetailClient record={record} />;
  } catch {
    notFound();
  }
}
