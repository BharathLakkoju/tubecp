import { createNeonSql, useAppPostgres } from "@/lib/db";
import type { ChatMessage } from "@/lib/types";

function sql() {
  return createNeonSql();
}

function mapRow(row: Record<string, unknown>): ChatMessage {
  return {
    role: row.role === "user" ? "user" : "assistant",
    content: String(row.content ?? ""),
    sources: Array.isArray(row.sources) ? (row.sources as ChatMessage["sources"]) : undefined,
    gaps: row.gaps ? String(row.gaps) : undefined,
    kind: row.kind === "welcome" ? "welcome" : undefined,
  };
}

export async function listKbChatRows(kbId: string): Promise<ChatMessage[]> {
  if (!useAppPostgres()) return [];
  const rows = (await sql().query(
    `SELECT role, content, sources, gaps, kind FROM kb_chat_messages WHERE kb_id = $1 ORDER BY id`,
    [kbId]
  )) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export async function replaceKbChatRows(kbId: string, messages: ChatMessage[]): Promise<void> {
  if (!useAppPostgres()) return;
  const client = sql();
  await client.query(`DELETE FROM kb_chat_messages WHERE kb_id = $1`, [kbId]);
  for (const message of messages) {
    await client.query(
      `INSERT INTO kb_chat_messages (kb_id, role, content, sources, gaps, kind)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
      [
        kbId,
        message.role,
        message.content,
        message.sources ? JSON.stringify(message.sources) : null,
        message.gaps ?? null,
        message.kind ?? null,
      ]
    );
  }
}

export async function deleteKbChatRows(kbId: string): Promise<void> {
  if (!useAppPostgres()) return;
  await sql().query(`DELETE FROM kb_chat_messages WHERE kb_id = $1`, [kbId]);
}
