import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import {
  addUserResearch,
  getSavedResearchRecord,
  listUserKnowledgeBaseRecords,
  listUserSavedResearchRecords,
  saveSavedResearchRecord,
} from "@/lib/store";
import type { KnowledgeBaseRecord, RankedVideo, ResearchResult } from "@/lib/types";

const KB_RESEARCH_ID_PREFIX = "kb:";

export function researchIdFromKnowledgeBase(kbId: string): string {
  return `${KB_RESEARCH_ID_PREFIX}${kbId}`;
}

export function knowledgeBaseIdFromResearchId(researchId: string): string | null {
  if (!researchId.startsWith(KB_RESEARCH_ID_PREFIX)) return null;
  return researchId.slice(KB_RESEARCH_ID_PREFIX.length);
}

export function researchResultFromRankedVideos(
  topic: string,
  rankedVideos: RankedVideo[]
): ResearchResult {
  return {
    topic,
    queriesUsed: [],
    videosSearched: rankedVideos.length,
    allVideos: rankedVideos,
    rankedVideos,
  };
}

/** Import ranked videos already stored on knowledge bases (pre–researches-library). */
export async function backfillSavedResearchesFromKnowledgeBases(userId: string): Promise<void> {
  const sub = await getUserSubscription(userId);
  const persistent = getPlan(sub.plan).persistentKbs;
  const kbs = await listUserKnowledgeBaseRecords(userId);

  for (const kb of kbs) {
    const ranked = kb.rankedVideos ?? [];
    if (ranked.length === 0) continue;

    const researchId = researchIdFromKnowledgeBase(kb.kbId);
    const existing = await getSavedResearchRecord(researchId);
    const result = researchResultFromRankedVideos(kb.topic, ranked);
    const record = {
      researchId,
      userId,
      topic: kb.topic,
      createdAt: existing?.createdAt ?? kb.createdAt,
      rankedVideoCount: ranked.length,
      videosSearched: ranked.length,
      result,
    };

    await saveSavedResearchRecord(record, persistent);
    await addUserResearch(userId, researchId, persistent);
  }
}

export async function listUserSavedResearchRecordsWithKbBackfill(userId: string) {
  await backfillSavedResearchesFromKnowledgeBases(userId);
  return listUserSavedResearchRecords(userId);
}

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
