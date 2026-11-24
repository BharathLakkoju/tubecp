#!/usr/bin/env node
/**
 * Acceptance-style static checks for the Inngest KB build pipeline.
 * Run: node scripts/verify-kb-inngest-acceptance.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function count(pattern, text) {
  const re = pattern.global ? pattern : new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  return [...text.matchAll(re)].length;
}

const failures = [];
const passes = [];

function pass(msg) {
  passes.push(msg);
}

function fail(msg) {
  failures.push(msg);
}

const functionsTs = read("lib/inngest/functions.ts");
const vercelJson = read("vercel.json");
const buildRoute = read("app/api/knowledge-base/build/route.ts");
const transportsTs = read("lib/kb/transports.ts");

// 1) No self-continuation chain in TS
const contPatterns = [
  /kb-build-continue/g,
  /after\s*\(/g,
];
let continuationHits = 0;
for (const p of contPatterns) {
  for (const file of ["lib", "app", "components"]) {
    try {
      const out = execFileSync("rg", ["-l", p.source.replace(/\\/g, ""), join(root, file), "--glob", "*.{ts,tsx}"], {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();
      if (out) continuationHits += out.split("\n").filter(Boolean).length;
    } catch {
      /* no matches */
    }
  }
}
if (continuationHits === 0) pass("No kb-build-continue / after() in app TS");
else fail(`Self-continuation patterns found in ${continuationHits} file(s)`);

// 2) Event enqueue path
if (transportsTs.includes('requestKbBuild') && transportsTs.includes("inngestTransport")) {
  pass("Default transport enqueues via requestKbBuild");
} else fail("inngestTransport → requestKbBuild wiring missing");

if (buildRoute.includes("startKnowledgeBaseBuild")) {
  pass("POST /api/knowledge-base/build starts orchestrated build");
} else fail("build route missing startKnowledgeBaseBuild");

// 3) Step bounds wired
const rawStepRun = count(/step\.run\(/g, functionsTs);
const wrappedStepRun = count(/kbBuildStepRun\(/g, functionsTs);
if (rawStepRun === 0 && wrappedStepRun >= 10) {
  pass(`All Inngest KB steps wrapped (${wrappedStepRun} kbBuildStepRun, 0 bare step.run)`);
} else {
  fail(`Step wrapper incomplete: kbBuildStepRun=${wrappedStepRun}, bare step.run=${rawStepRun}`);
}

if (functionsTs.includes("chunkIdsInBatches") && functionsTs.includes("embed-")) {
  pass("Embedding uses batched durable steps");
} else fail("Embed batch steps not found in kb build video function");

// 4) Hobby duration cap
if (buildRoute.includes("maxDuration = 60")) pass("build route maxDuration 60");
else fail("build route maxDuration not 60");

if (vercelJson.includes('"maxDuration": 60') && !vercelJson.includes("index-video")) {
  pass("vercel.json API maxDuration 60, no dead index-video override");
} else fail("vercel.json duration or index-video cleanup wrong");

// 5) Unit tests (real run)
let testOut = "";
try {
  testOut = execFileSync(
    "npm",
    ["run", "test", "--", "tests/unit/kb-build-steps.test.ts", "tests/unit/kb-inngest-step.test.ts", "tests/unit/kb-build-job.test.ts"],
    { cwd: root, encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } }
  );
} catch (err) {
  testOut = (err.stdout || "") + (err.stderr || "");
  fail("KB unit test bundle failed (see output)");
}
if (!failures.some((f) => f.includes("unit test"))) {
  const m = testOut.match(/Tests\s+(\d+) passed/);
  if (m) pass(`KB unit tests passed (${m[1]} in selected files)`);
  else fail("Could not parse vitest output");
}

console.log("=== KB Inngest acceptance (automated) ===\n");
for (const p of passes) console.log(`PASS  ${p}`);
for (const f of failures) console.log(`FAIL  ${f}`);
console.log(`\n${passes.length} passed, ${failures.length} failed`);

const notProven = [
  "NOT PROVEN (needs prod/staging): 10-video build with tab closed ≤10m without manual Resume",
  "NOT PROVEN (needs Inngest cloud): end-to-end function execution with real transcripts",
];
console.log("\n=== Manual / environment ===");
for (const line of notProven) console.log(line);

process.exit(failures.length === 0 ? 0 : 1);