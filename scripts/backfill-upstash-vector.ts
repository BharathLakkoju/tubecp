/**
 * One-off copy of existing chunk embeddings into Upstash Vector.
 *
 * Usage:
 *   npx tsx scripts/backfill-upstash-vector.ts
 *   npx tsx scripts/backfill-upstash-vector.ts --kbId=<id>
 *   npx tsx scripts/backfill-upstash-vector.ts --dry-run
 *
 * Requires UPSTASH_VECTOR_REST_URL / UPSTASH_VECTOR_REST_TOKEN (or uses the
 * in-memory index in local tests). Existing Redis IVF keys are left untouched.
 */

import { loadEnvFiles } from "../lib/load-env";
import {
  backfillKnowledgeBaseVectors,
  loadKnowledgeBasesForBackfill,
} from "../lib/store/backfill-upstash-vector";

loadEnvFiles();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const kbId =
  args.find((arg) => arg.startsWith("--kbId="))?.slice("--kbId=".length) ??
  (args.includes("--kbId") ? args[args.indexOf("--kbId") + 1] : undefined);

async function main() {
  const kbs = await loadKnowledgeBasesForBackfill(kbId);
  let upserted = 0;
  let skipped = 0;

  console.log(
    `${dryRun ? "Dry run: " : ""}backfilling ${kbs.length} knowledge base${kbs.length === 1 ? "" : "s"} into Upstash Vector`
  );

  for (const kb of kbs) {
    const result = await backfillKnowledgeBaseVectors(kb, { dryRun });
    upserted += result.upserted;
    skipped += result.skipped;
    console.log(
      `  ${result.kbId} (${result.topic}): ${result.upserted} vectors${result.skipped ? `, ${result.skipped} without embeddings` : ""}`
    );
  }

  console.log(`Done. upserted=${upserted} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
