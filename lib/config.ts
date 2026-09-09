function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  llmModel: process.env.LLM_MODEL ?? "openai/gpt-4o-mini",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
  licenseKey: process.env.LICENSE_KEY ?? "",
};

export function assertYoutubeKey(): string {
  return required("YOUTUBE_API_KEY", config.youtubeApiKey || undefined);
}

export function assertOpenRouterKey(): string {
  return required("OPENROUTER_API_KEY", config.openrouterApiKey || undefined);
}

export function isLicenseValid(key?: string): boolean {
  const licenseKey = process.env.LICENSE_KEY ?? config.licenseKey;
  if (!licenseKey) return true;
  return key === licenseKey;
}
