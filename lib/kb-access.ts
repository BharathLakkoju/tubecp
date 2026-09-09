import { getKnowledgeBase } from "@/lib/store";

export class KbAccessError extends Error {
  code = "KB_ACCESS";
  constructor(message: string) {
    super(message);
    this.name = "KbAccessError";
  }
}

export async function assertKbAccess(kbId: string, userId: string) {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) {
    throw new KbAccessError("Knowledge base not found");
  }
  if (kb.userId !== userId) {
    throw new KbAccessError("You do not have access to this knowledge base");
  }
  return kb;
}
