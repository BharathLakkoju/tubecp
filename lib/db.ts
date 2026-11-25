import dns from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { isE2eAuthBypass } from "@/lib/e2e";

dns.setDefaultResultOrder("ipv4first");

/**
 * Neon HTTP SQL (`api.<region>.aws.neon.tech`) is dual-stack. This machine (and
 * many local networks) cannot connect on IPv6, so Node fetch races 3 A + 3 AAAA
 * records and often fails the whole query with AggregateError ETIMEDOUT.
 */
const neonHttpAgent = new Agent({
  connect: { family: 4, timeout: 15_000 },
});

neonConfig.poolQueryViaFetch = true;
neonConfig.fetchFunction = (url: string | URL, init?: RequestInit) =>
  undiciFetch(url, { ...(init as Parameters<typeof undiciFetch>[1]), dispatcher: neonHttpAgent });

/** True when application tables in Postgres are the control-plane source of truth. */
export function useAppPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim()) && !isE2eAuthBypass();
}

export function createNeonSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(url);
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