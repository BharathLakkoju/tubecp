import { createNeonSql, useAppPostgres } from "@/lib/db";
import type { KnowledgeBaseRecord, RankedVideo } from "@/lib/types";

function sql() {
  return createNeonSql();
}

function mapRow(row: Record<string, unknown>): KnowledgeBaseRecord {
  const ranked = Array.isArray(row.ranked_videos) ? (row.ranked_videos as RankedVideo[]) : [];
  return {
    kbId: String(row.id),
    userId: String(row.user_id),
    topic: String(row.topic),
    status: row.status as KnowledgeBaseRecord["status"],
    persistent: Boolean(row.persistent),
    videoIds: Array.isArray(row.video_ids) ? (row.video_ids as string[]) : [],
    chunkIds: Array.isArray(row.chunk_ids) ? (row.chunk_ids as string[]) : [],
    chunksIndexed: Number(row.chunks_indexed ?? 0),
    videosIndexed: Number(row.videos_indexed ?? 0),
    totalMinutes: Number(row.total_minutes ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    rankedVideos: ranked,
    buildOptions: {
      transcriptMode: row.transcript_mode === "stt" ? "stt" : "captions",
    },
  };
}

export async function upsertKnowledgeBaseRow(kb: KnowledgeBaseRecord): Promise<void> {
  if (!useAppPostgres()) return;
  await sql().query(
    `INSERT INTO knowledge_bases (
       id, user_id, topic, status, persistent, transcript_mode, ranked_videos,
       video_ids, chunk_ids, chunks_indexed, videos_indexed, total_minutes,
       created_at, updated_at, ready_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7::jsonb, $8::text[], $9::text[], $10, $11, $12, $13, NOW(), $14
     )
     ON CONFLICT (id) DO UPDATE SET
       topic = EXCLUDED.topic,
       status = EXCLUDED.status,
       persistent = EXCLUDED.persistent,
       transcript_mode = EXCLUDED.transcript_mode,
       ranked_videos = EXCLUDED.ranked_videos,
       video_ids = EXCLUDED.video_ids,
       chunk_ids = EXCLUDED.chunk_ids,
       chunks_indexed = EXCLUDED.chunks_indexed,
       videos_indexed = EXCLUDED.videos_indexed,
       total_minutes = EXCLUDED.total_minutes,
       updated_at = NOW(),
       ready_at = EXCLUDED.ready_at`,
    [
      kb.kbId,
      kb.userId,
      kb.topic,
      kb.status,
      Boolean(kb.persistent),
      kb.buildOptions?.transcriptMode ?? "captions",
      JSON.stringify(kb.rankedVideos ?? []),
      kb.videoIds,
      kb.chunkIds,
      kb.chunksIndexed,
      kb.videosIndexed,
      kb.totalMinutes,
      kb.createdAt,
      kb.status === "ready" ? new Date().toISOString() : null,
    ]
  );
}

export async function getKnowledgeBaseRow(kbId: string): Promise<KnowledgeBaseRecord | null> {
  if (!useAppPostgres()) return null;
  const rows = (await sql().query(`SELECT * FROM knowledge_bases WHERE id = $1`, [kbId])) as Record<
    string,
    unknown
  >[];
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listKnowledgeBaseRows(userId: string): Promise<KnowledgeBaseRecord[]> {
  if (!useAppPostgres()) return [];
  const rows = (await sql().query(
    `SELECT * FROM knowledge_bases WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  )) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export async function listAllKnowledgeBaseRows(): Promise<KnowledgeBaseRecord[]> {
  if (!useAppPostgres()) return [];
  const rows = (await sql().query(
    `SELECT * FROM knowledge_bases ORDER BY created_at DESC`
  )) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export async function deleteKnowledgeBaseRow(kbId: string): Promise<void> {
  if (!useAppPostgres()) return;
  await sql().query(`DELETE FROM knowledge_bases WHERE id = $1`, [kbId]);
}
