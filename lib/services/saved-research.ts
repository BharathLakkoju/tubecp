import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import { assertResearchAccess } from "@/lib/research-access";
import {
  addUserResearch,
  deleteSavedResearchRecord,
  getSavedResearchRecord,
  getKnowledgeBase,
  listUserKnowledgeBaseRecords,
  listUserSavedResearchRecords,
  removeUserResearch,
  saveSavedResearchRecord,
} from "@/lib/store";
import { knowledgeBaseIdFromResearchId } from "@/lib/researches";
import type { KnowledgeBaseRecord, RankedVideo, ResearchResult } from "@/lib/types";

const KB_RESEARCH_ID_PREFIX = "kb:";

export function researchIdFromKnowledgeBase(kbId: string): string {
  return `${KB_RESEARCH_ID_PREFIX}${kbId}`;
}

export { knowledgeBaseIdFromResearchId };

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
  const records = await listUserSavedResearchRecords(userId);
  return pruneStaleKbMirrorResearches(userId, records);
}

async function pruneStaleKbMirrorResearches(
  userId: string,
  records: Awaited<ReturnType<typeof listUserSavedResearchRecords>>
) {
  const kept = [];
  for (const record of records) {
    const kbId = knowledgeBaseIdFromResearchId(record.researchId);
    if (!kbId) {
      kept.push(record);
      continue;
    }
    const kb = await getKnowledgeBase(kbId);
    if (kb && kb.userId === userId) {
      kept.push(record);
      continue;
    }
    await deleteSavedResearchRecord(record.researchId);
    await removeUserResearch(userId, record.researchId);
  }
  return kept;
}

export async function deleteSavedResearch(researchId: string, userId: string): Promise<void> {
  await assertResearchAccess(researchId, userId);
  await deleteSavedResearchRecord(researchId);
  await removeUserResearch(userId, researchId);
}

export async function deleteSavedResearchMirrorForKnowledgeBase(
  kbId: string,
  userId: string
): Promise<void> {
  const researchId = researchIdFromKnowledgeBase(kbId);
  const record = await getSavedResearchRecord(researchId);
  if (!record || record.userId !== userId) return;
  await deleteSavedResearchRecord(researchId);
  await removeUserResearch(userId, researchId);
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
