/**
 * Runs Next.js dev server + a Cloudflare quick tunnel (public HTTPS URL).
 *
 * Disable tunnel: DEV_TUNNEL=0 npm run dev  (or use npm run dev:local)
 * Port: PORT=3000 (default)
 */

import { spawn, type ChildProcess } from "node:child_process";
import { Tunnel } from "cloudflared";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const tunnelEnabled = process.env.DEV_TUNNEL !== "0" && process.env.DEV_TUNNEL !== "false";

let nextProc: ChildProcess | null = null;
let tunnel: Tunnel | null = null;
let printedUrl = false;

function log(message: string): void {
  console.log(message);
}

function printTunnelBanner(publicUrl: string): void {
  if (printedUrl) return;
  printedUrl = true;

  const line = "─".repeat(58);
  log(`\n${line}`);
  log("  Public dev URL (any device / network):");
  log(`  ${publicUrl}`);
  log("");
  log("  OAuth on this URL:");
  log(`  npm run auth:urls ${publicUrl}`);
  log("  Copy printed AUTH_URL / NEXT_PUBLIC_APP_URL into .env.local, then restart dev.");
  log(line + "\n");
}

async function waitForDevServer(): Promise<void> {
  const deadline = Date.now() + 120_000;
  const origin = `http://127.0.0.1:${port}`;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(origin, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(`Timed out waiting for Next.js on ${origin}`);
}

function startNext(): ChildProcess {
  const proc = spawn("npx", ["next", "dev", "-p", String(port)], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  proc.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  return proc;
}

function startTunnel(): void {
  tunnel = Tunnel.quick(`http://127.0.0.1:${port}`);
  tunnel.on("url", (url) => printTunnelBanner(url));
  tunnel.on("error", (err) => {
    console.error("[tunnel] error:", err.message);
  });
  tunnel.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[tunnel] cloudflared exited with code ${code}`);
    }
  });
}

function shutdown(): void {
  tunnel?.stop();
  if (nextProc && !nextProc.killed) {
    nextProc.kill("SIGTERM");
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

async function main(): Promise<void> {
  log(`Starting Next.js on http://localhost:${port} …`);

  nextProc = startNext();
  await waitForDevServer();

  if (tunnelEnabled) {
    log("Starting Cloudflare tunnel …");
    startTunnel();
  } else {
    log("DEV_TUNNEL is disabled — local only (http://localhost:" + port + ")");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  shutdown();
  process.exit(1);
});
