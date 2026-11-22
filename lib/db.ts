import { Pool } from "@neondatabase/serverless";
import { isE2eAuthBypass } from "@/lib/e2e";

/** True when application tables in Postgres are the control-plane source of truth. */
export function useAppPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim()) && !isE2eAuthBypass();
}

/** Per-request pool for serverless handlers (Auth.js, API routes). Do not cache at module scope. */
export function createDbPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({ connectionString: url });
}

let migrationPool: Pool | null = null;

/** Singleton pool for migration scripts and CLI tools only. */
export function getDbPool(): Pool {
  if (!migrationPool) {
    migrationPool = createDbPool();
  }
  return migrationPool;
}
