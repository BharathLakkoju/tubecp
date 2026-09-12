export const EMBEDDING_INPUT_MAX = 8000;

const FALLBACK_EMBEDDING_TEXT = "video transcript excerpt";

/** Clean text before sending to embedding providers that re-parse JSON strictly. */
export function sanitizeEmbeddingInput(text: string): string {
  if (!text) return "";

  let out = "";

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += text[i] + text[i + 1];
        i++;
        continue;
      }
      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) {
      continue;
    }

    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      continue;
    }

    if (code === 127) {
      continue;
    }

    out += text[i];
  }

  return out
    .replace(/\\/g, "/")
    .replace(/\uFFFD/g, "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasMeaningfulEmbeddingContent(text: string): boolean {
  const sanitized = sanitizeEmbeddingInput(text);
  return /[\p{L}\p{N}]{3,}/u.test(sanitized);
}

export function prepareEmbeddingInput(text: string, maxLen = EMBEDDING_INPUT_MAX): string {
  let sanitized = sanitizeEmbeddingInput(text);
  if (!hasMeaningfulEmbeddingContent(sanitized)) {
    sanitized = FALLBACK_EMBEDDING_TEXT;
  }

  if (sanitized.length <= maxLen) {
    return sanitized;
  }

  let end = maxLen;
  const prev = sanitized.charCodeAt(end - 1);
  const next = sanitized.charCodeAt(end);

  if (prev >= 0xd800 && prev <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
    end -= 1;
  }

  const truncated = sanitized.slice(0, end).trim();
  return truncated.length > 0 ? truncated : FALLBACK_EMBEDDING_TEXT;
}
