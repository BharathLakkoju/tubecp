export async function deleteKnowledgeBase(kbId: string): Promise<void> {
  const res = await fetch(`/api/knowledge-base/${kbId}`, {
    method: "DELETE",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to delete knowledge base");
  }
}
