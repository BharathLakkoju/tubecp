import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppUrl } from "@/lib/app-url";

export const KB_BUILD_CONTINUATION_HEADER = "x-kb-build-continuation";

function continuationToken(kbId: string, secret: string): string {
  return createHmac("sha256", secret).update(`kb-build:${kbId}`).digest("hex");
}

export function isKbBuildContinuation(kbId: string, headerValue: string | null): boolean {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || !headerValue) return false;

  const expected = continuationToken(kbId, secret);
  const provided = Buffer.from(headerValue);
  const actual = Buffer.from(expected);
  if (provided.length !== actual.length) return false;
  return timingSafeEqual(provided, actual);
}

/** Start a new invocation so the next video gets its own duration budget. */
export async function scheduleKbBuildContinuation(kbId: string): Promise<void> {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    console.error(`KB build continuation skipped for ${kbId}: AUTH_SECRET is not set`);
    return;
  }

  const url = `${getAppUrl()}/api/knowledge-base/${encodeURIComponent(kbId)}/kick-build`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        [KB_BUILD_CONTINUATION_HEADER]: continuationToken(kbId, secret),
      },
    });
    if (!res.ok) {
      console.error(`KB build continuation failed for ${kbId}: ${res.status}`);
    }
  } catch (err) {
    console.error(`KB build continuation failed for ${kbId}:`, err);
  }
}
