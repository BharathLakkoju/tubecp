import { parseJsonResponseBody } from "@/lib/client/fetch-json";

export async function deleteSavedResearch(researchId: string): Promise<void> {
  const res = await fetch(`/api/researches/${encodeURIComponent(researchId)}`, {
    method: "DELETE",
  });
  const data = await parseJsonResponseBody<{ error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to delete research");
  }
}
