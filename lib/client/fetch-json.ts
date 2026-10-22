export class FetchTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

/** Parse JSON bodies safely when the server returns HTML or an empty timeout response. */
export async function parseJsonResponseBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(`Server timed out (HTTP ${res.status}). Try again.`);
    }
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    if (!res.ok) {
      throw new Error(`Server timed out (HTTP ${res.status}). Try again.`);
    }
    throw new Error("Server returned an invalid response. Try again.");
  }
}

/** Matches Vercel `maxDuration` on index-video (300s) with a small buffer. */
export const KB_INDEX_VIDEO_TIMEOUT_MS = 280_000;

export async function postJsonWithTimeout<T>(
  url: string,
  body: unknown,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await parseJsonResponseBody<T & { code?: string; error?: string }>(res);
    if (!res.ok) {
      const code = data.code ? `[${data.code}] ` : "";
      throw new Error(`${code}${data.error ?? `Request failed: ${res.status}`}`);
    }
    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchTimeoutError(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s. The video may be too long for one pass, or the server is overloaded — try Continue build to resume.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
