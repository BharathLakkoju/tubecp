import { getSavedResearchRecord } from "@/lib/store";
import type { SavedResearchRecord } from "@/lib/types";

export class ResearchAccessError extends Error {
  code = "RESEARCH_ACCESS";
  constructor(message: string) {
    super(message);
    this.name = "ResearchAccessError";
  }
}

export async function assertResearchAccess(
  researchId: string,
  userId: string
): Promise<SavedResearchRecord> {
  const record = await getSavedResearchRecord(researchId);
  if (!record) {
    throw new ResearchAccessError("Research not found");
  }
  if (record.userId !== userId) {
    throw new ResearchAccessError("You do not have access to this research");
  }
  return record;
}
