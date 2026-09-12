/**
 * Evaluation runner — scores research quality against eval/dataset.json
 *
 * Usage:
 *   YOUTUBE_API_KEY=... OPENROUTER_API_KEY=... npm run eval
 *   npm run eval -- --topic ai-saas-monetization
 *   npm run eval -- --runs 3   # stability test (same topic, multiple runs)
 */

import fs from "node:fs";
import path from "node:path";
import { runResearchPipeline } from "../lib/services/research-pipeline.js";

interface EvalTopic {
  id: string;
  topic: string;
  minRelevantVideos: number;
  relevanceMin: number;
  notes: string;
}

interface EvalDataset {
  topics: EvalTopic[];
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const runs = parseInt(args.find((a) => a.startsWith("--runs="))?.split("=")[1] ?? "1", 10);
const topicFilter =
  args.find((a) => a.startsWith("--topic="))?.split("=")[1] ??
  (args.indexOf("--topic") >= 0 ? args[args.indexOf("--topic") + 1] : undefined);

async function evaluateTopic(item: EvalTopic, runIndex?: number) {
  const runLabel = runIndex !== undefined ? ` [run ${runIndex + 1}]` : "";
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Topic${runLabel}: ${item.topic}`);
  console.log(`Notes: ${item.notes}`);

  const result = await runResearchPipeline(item.topic, {
    planId: "free",
    onProgress: (p) => {
      if (p.stage === "analyzing" || p.stage === "complete") {
        process.stdout.write(`  ${p.message}\n`);
      }
    },
  });

  const passing = result.rankedVideos.filter((v) => v.relevanceScore >= item.relevanceMin);
  const passed = passing.length >= item.minRelevantVideos;

  console.log(`\nRanked: ${result.rankedVideos.length} | Passing (≥${item.relevanceMin}): ${passing.length}`);
  for (const v of result.rankedVideos.slice(0, 8)) {
    console.log(`  ✓ ${v.relevanceScore} — ${v.title.slice(0, 60)}`);
  }
  console.log(`Expected min: ${item.minRelevantVideos} | Result: ${passed ? "PASS" : "FAIL"}`);

  return {
    id: item.id,
    passed,
    ranked: result.rankedVideos.length,
    passing: passing.length,
    expected: item.minRelevantVideos,
  };
}

async function main() {
  const datasetPath = path.join(process.cwd(), "eval", "dataset.json");
  const dataset: EvalDataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

  let topics = dataset.topics;
  if (topicFilter) {
    topics = topics.filter((t) => t.id === topicFilter);
    if (topics.length === 0) {
      console.error(`Topic not found: ${topicFilter}`);
      process.exit(1);
    }
  }

  if (dryRun) {
    console.log("Eval topics:");
    topics.forEach((t) => console.log(`  - ${t.id}: ${t.topic}`));
    return;
  }

  if (!process.env.YOUTUBE_API_KEY || !process.env.OPENROUTER_API_KEY) {
    console.error("Set YOUTUBE_API_KEY and OPENROUTER_API_KEY to run eval.");
    process.exit(1);
  }

  const results = [];

  if (runs > 1 && topics.length === 1) {
    console.log(`Stability test: ${runs} runs on "${topics[0].topic}"`);
    for (let i = 0; i < runs; i++) {
      results.push(await evaluateTopic(topics[0], i));
    }
    const passed = results.filter((r) => r.passed).length;
    const rate = Math.round((passed / runs) * 100);
    console.log(`\n${"=".repeat(60)}`);
    console.log(`STABILITY: ${passed}/${runs} passed (${rate}% success rate)`);
    if (rate < 90) {
      console.log("Target is 90%+ — review failing runs above.");
      process.exit(1);
    }
    return;
  }

  for (const topic of topics) {
    results.push(await evaluateTopic(topic));
  }

  const passed = results.filter((r) => r.passed).length;
  const rate = Math.round((passed / results.length) * 100);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`SUMMARY: ${passed}/${results.length} topics passed (${rate}%)`);
  if (rate < 90) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
