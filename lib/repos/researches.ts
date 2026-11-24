import { createNeonSql, useAppPostgres } from "@/lib/db";
import type { ResearchResult, SavedResearchRecord } from "@/lib/types";

function sql() {
  return createNeonSql();
}

function mapRow(row: Record<string, unknown>): SavedResearchRecord {
  const result = (row.result ?? {}) as ResearchResult;
  return {
    researchId: String(row.id),
    userId: String(row.user_id),
    topic: String(row.topic),
    createdAt: new Date(String(row.created_at)).toISOString(),
    rankedVideoCount: Number(row.ranked_video_count ?? 0),
    videosSearched: Number(row.videos_searched ?? 0),
    result,
    kbId: row.kb_id ? String(row.kb_id) : undefined,
  };
}

export async function upsertSavedResearchRow(record: SavedResearchRecord): Promise<void> {
  if (!useAppPostgres()) return;
  await sql().query(
    `INSERT INTO saved_researches (
       id, user_id, topic, result, kb_id, ranked_video_count, videos_searched, created_at
     ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       topic = EXCLUDED.topic,
       result = EXCLUDED.result,
       kb_id = EXCLUDED.kb_id,
       ranked_video_count = EXCLUDED.ranked_video_count,
       videos_searched = EXCLUDED.videos_searched`,
    [
      record.researchId,
      record.userId,
      record.topic,
      JSON.stringify(record.result),
      record.kbId ?? null,
      record.rankedVideoCount,
      record.videosSearched,
      record.createdAt,
    ]
  );
}

export async function getSavedResearchRow(researchId: string): Promise<SavedResearchRecord | null> {
  if (!useAppPostgres()) return null;
  const rows = (await sql().query(`SELECT * FROM saved_researches WHERE id = $1`, [researchId])) as Record<
    string,
    unknown
  >[];
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listSavedResearchRows(userId: string): Promise<SavedResearchRecord[]> {
  if (!useAppPostgres()) return [];
  const rows = (await sql().query(
    `SELECT * FROM saved_researches WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  )) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export async function deleteSavedResearchRow(researchId: string): Promise<void> {
  if (!useAppPostgres()) return;
  await sql().query(`DELETE FROM saved_researches WHERE id = $1`, [researchId]);
}
