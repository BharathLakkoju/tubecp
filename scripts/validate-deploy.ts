#!/usr/bin/env tsx
/**
 * Validate production environment variables before deploy.
 *
 * Usage:
 *   npm run validate:deploy
 *   NODE_ENV=production npm run validate:deploy
 */

import { loadEnvFiles } from "../lib/load-env";
import { runDeployChecks } from "../lib/deploy/validate";

loadEnvFiles();

const result = runDeployChecks(process.env);

console.log("TubeCP production deploy validation\n");

for (const check of result.checks) {
  const icon = check.passed ? "✓" : check.required ? "✗" : "!";
  const suffix = check.detail ? ` — ${check.detail}` : "";
  console.log(`${icon} ${check.label}${suffix}`);
}

console.log("");

if (result.ready) {
  console.log("Ready for production deploy.");
  if (result.warnings.length > 0) {
    console.log(`${result.warnings.length} optional warning(s) — review before launch.`);
  }
  process.exit(0);
}

console.error(`Deploy blocked: ${result.errors.length} required check(s) failed.`);
process.exit(1);
