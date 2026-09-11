import OpenAI from "openai";
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

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: assertOpenRouterKey(),
      baseURL: config.openrouterBaseUrl,
      defaultHeaders: {
        "HTTP-Referer": "https://tubecp.com",
        "X-Title": "tubecp",
      },
    });
  }
  return client;
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const openai = getOpenAIClient();
  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: config.llmModel,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    })
  );
  return response.choices[0]?.message?.content ?? "";
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await withRetry(() =>
    openai.embeddings.create({
      model: config.embeddingModel,
      input: text.slice(0, 8000),
    })
  );
  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const openai = getOpenAIClient();
  const response = await withRetry(() =>
    openai.embeddings.create({
      model: config.embeddingModel,
      input: texts.map((t) => t.slice(0, 8000)),
    })
  );
  return response.data.map((d) => d.embedding);
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
