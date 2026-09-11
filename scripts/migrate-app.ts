/**
 * Apply Auth.js + application schema to Neon Postgres.
 * Automatically removes legacy Better Auth tables when detected.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvFiles } from "../lib/load-env";
import { getDbPool } from "../lib/db";

loadEnvFiles();

function readSql(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), "utf8");
}

async function main() {
  const pool = getDbPool();

  const transitionSql = readSql("../lib/db/migrate-transition.sql");
  await pool.query(transitionSql);
  console.log("Legacy schema transition applied (if needed).");

  await pool.query(readSql("../lib/db/auth-schema.sql"));
  console.log("Auth.js schema applied.");

  await pool.query(readSql("../lib/db/schema.sql"));
  console.log("Application schema applied.");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
