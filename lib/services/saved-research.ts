import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import {
  addUserResearch,
  getSavedResearchRecord,
  saveSavedResearchRecord,
} from "@/lib/store";
import type { ResearchResult } from "@/lib/types";

export async function persistUserResearch(
  userId: string,
  researchId: string,
  result: ResearchResult
): Promise<void> {
  const sub = await getUserSubscription(userId);
  const persistent = getPlan(sub.plan).persistentKbs;

  const existing = await getSavedResearchRecord(researchId);
  const record = {
    researchId,
    userId,
    topic: result.topic,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    rankedVideoCount: result.rankedVideos.length,
    videosSearched: result.videosSearched,
    result,
  };

  await saveSavedResearchRecord(record, persistent);
  await addUserResearch(userId, researchId, persistent);
}
