import { getChunksByIds, getKnowledgeBase } from "@/lib/store";
import { upsertKbChunkVectors } from "@/lib/store/kb-vectors";
import { listAllKnowledgeBaseRows } from "@/lib/repos/knowledge-bases";
import type { KnowledgeBaseRecord } from "@/lib/types";

export type BackfillKbResult = {
  kbId: string;
  topic: string;
  upserted: number;
  skipped: number;
};

export async function loadKnowledgeBasesForBackfill(
  kbId?: string
): Promise<KnowledgeBaseRecord[]> {
  if (kbId) {
    const kb = await getKnowledgeBase(kbId);
    if (!kb) {
      throw new Error(`Knowledge base not found: ${kbId}`);
    }
    return [kb];
  }

  const rows = await listAllKnowledgeBaseRows();
  if (rows.length > 0) return rows;
  throw new Error("No knowledge bases found. Pass --kbId when Postgres is unavailable.");
}

export async function backfillKnowledgeBaseVectors(
  kb: KnowledgeBaseRecord,
  options?: { dryRun?: boolean }
): Promise<BackfillKbResult> {
  const chunks = await getChunksByIds(kb.chunkIds);
  const withEmbeddings = chunks.filter((chunk) => Boolean(chunk.embedding));
  const skipped = chunks.length - withEmbeddings.length;

  if (!options?.dryRun && withEmbeddings.length > 0) {
    await upsertKbChunkVectors(kb.kbId, withEmbeddings);
  }

  return {
    kbId: kb.kbId,
    topic: kb.topic,
    upserted: withEmbeddings.length,
    skipped,
  };
}
