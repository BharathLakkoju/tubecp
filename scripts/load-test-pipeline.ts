/**
 * Local pipeline load test (in-memory jobs, stubbed YouTube/embeddings).
 * Usage: tsx scripts/load-test-pipeline.ts --videos 30 --users 2
 */
import { runPipelineLoadTest } from "../lib/pipeline/load-test";

function arg(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return Number(process.argv[index + 1]);
  return fallback;
}

async function main() {
  const result = await runPipelineLoadTest({
    videoCount: arg("videos", 8),
    userCount: arg("users", 2),
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
