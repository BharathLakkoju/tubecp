import { parseJsonResponseBody } from "@/lib/client/fetch-json";

export async function deleteKnowledgeBase(kbId: string): Promise<void> {
  const res = await fetch(`/api/knowledge-base/${kbId}`, {
    method: "DELETE",
  });

  const data = await parseJsonResponseBody<{ error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to delete knowledge base");
  }
}
