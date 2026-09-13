#!/usr/bin/env tsx
/**
 * Smoke-test a deployed TubeCP instance.
 *
 * Usage:
 *   npm run smoke:production -- --url https://your-app.vercel.app
 */

import { validateRemoteHealth, type RemoteHealthPayload } from "../lib/deploy/validate";

function parseArgs(argv: string[]): { baseUrl: string } {
  const urlIndex = argv.indexOf("--url");
  const baseUrl = urlIndex >= 0 ? argv[urlIndex + 1] : process.env.SMOKE_BASE_URL;

  if (!baseUrl?.trim()) {
    console.error("Usage: npm run smoke:production -- --url https://your-app.vercel.app");
    process.exit(1);
  }

  return { baseUrl: baseUrl.replace(/\/$/, "") };
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; body: unknown }> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

function printResult(label: string, passed: boolean, detail?: string) {
  console.log(`${passed ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const { baseUrl } = parseArgs(process.argv.slice(2));
  console.log(`TubeCP production smoke test\nTarget: ${baseUrl}\n`);

  let failed = false;

  for (const path of ["/", "/pricing", "/sign-in"]) {
    try {
      const response = await fetch(`${baseUrl}${path}`);
      const passed = response.ok;
      printResult(`GET ${path}`, passed, `HTTP ${response.status}`);
      if (!passed) failed = true;
    } catch (err) {
      printResult(`GET ${path}`, false, String(err));
      failed = true;
    }
  }

  const health = await fetchJson(`${baseUrl}/api/health`);
  printResult("GET /api/health", health.ok, `HTTP ${health.status}`);

  if (!health.ok) {
    failed = true;
  } else {
    const validation = validateRemoteHealth(health.body as RemoteHealthPayload);
    for (const check of validation.checks) {
      printResult(check.label, check.passed, check.detail);
    }
    if (!validation.ready) {
      failed = true;
    }
  }

  console.log("");
  if (failed) {
    console.error("Smoke test failed.");
    process.exit(1);
  }

  console.log("Smoke test passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
