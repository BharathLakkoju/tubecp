import { assertOpenRouterKey, config } from "../config";

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  if (status && RETRYABLE_STATUSES.has(status)) return true;
  const message = String((err as Error).message ?? err);
  return /\b(429|502|503|504)\b/.test(message) || /rate limit/i.test(message);
}

async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err) || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** attempt));
    }
  }
  throw lastErr;
}

function openRouterHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${assertOpenRouterKey()}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://tubecp.com",
    "X-Title": "tubecp",
  };
}

class OpenRouterError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
  }
}

async function openRouterPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${config.openrouterBaseUrl.replace(/\/$/, "")}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new OpenRouterError(
      response.status,
      `OpenRouter ${response.status}: ${detail.slice(0, 500)}`
    );
  }

  return (await response.json()) as T;
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const data = await withRetry(() =>
    openRouterPost<{
      choices?: Array<{ message?: { content?: string } }>;
    }>("/chat/completions", {
      model: config.llmModel,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    })
  );

  return data.choices?.[0]?.message?.content ?? "";
}

export async function* generateTextStream(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): AsyncGenerator<string> {
  const url = `${config.openrouterBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: config.llmModel,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2000,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new OpenRouterError(
      response.status,
      `OpenRouter ${response.status}: ${detail.slice(0, 500)}`
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("OpenRouter returned no response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const text = parsed.choices?.[0]?.delta?.content;
        if (text) yield text;
      } catch {
        // skip malformed SSE chunks
      }
    }
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const data = await withRetry(() =>
    openRouterPost<{ data?: Array<{ embedding: number[] }> }>("/embeddings", {
      model: config.embeddingModel,
      input: text.slice(0, 8000),
    })
  );

  const embedding = data.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("OpenRouter returned no embedding data");
  }
  return embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const data = await withRetry(() =>
    openRouterPost<{ data?: Array<{ embedding: number[] }> }>("/embeddings", {
      model: config.embeddingModel,
      input: texts.map((t) => t.slice(0, 8000)),
    })
  );

  const embeddings = data.data?.map((item) => item.embedding) ?? [];
  if (embeddings.length !== texts.length) {
    throw new Error(
      `OpenRouter returned ${embeddings.length} embeddings for ${texts.length} inputs`
    );
  }
  return embeddings;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
