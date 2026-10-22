import { ProxyAgent, fetch as undiciFetch } from "undici";

const DEFAULT_REQUEST_TIMEOUT_MS = 8_000;

let proxyAgent: ProxyAgent | undefined;

function proxyUrl(): string | undefined {
  return process.env.YOUTUBE_HTTP_PROXY?.trim() || undefined;
}

async function proxiedFetch(url: string, init?: RequestInit): Promise<Response> {
  const proxy = proxyUrl();
  if (!proxy) {
    return fetch(url, init);
  }

  if (!proxyAgent) {
    proxyAgent = new ProxyAgent(proxy);
  }

  const response = await undiciFetch(url, {
    ...(init as object),
    dispatcher: proxyAgent,
  });

  return response as unknown as Response;
}

export async function youtubeHttpFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const { timeoutMs: _omit, signal: callerSignal, ...rest } = init ?? {};

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal =
    callerSignal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal;

  return proxiedFetch(url, { ...rest, signal });
}
