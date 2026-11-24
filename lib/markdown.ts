const ALLOWED_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function decodeHrefForSchemeCheck(href: string): string {
  let decoded = href;

  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded.replace(/\+/g, " "));
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }

  return decoded
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function hasDangerousScheme(href: string): boolean {
  const normalized = decodeHrefForSchemeCheck(href)
    .trim()
    .toLowerCase()
    .replace(/[\s\u0000-\u001f]+/g, "");

  return /^(javascript|vbscript|data|file|blob):/.test(normalized);
}

/** Allow only safe http(s), mailto, and same-site relative links for rendered markdown. */
export function sanitizeMarkdownHref(href: string | undefined | null): string | null {
  if (href == null) return null;

  const trimmed = href.trim().replace(/[\u0000-\u001F\u007F]/g, "");
  if (!trimmed) return null;

  if (hasDangerousScheme(trimmed)) return null;

  if (trimmed.startsWith("#")) {
    return /^#[\w%.\-/?=&]*$/.test(trimmed) ? trimmed : null;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return /^\/[^\s\\]*$/.test(trimmed) ? trimmed : null;
  }

  if (trimmed.startsWith("//")) return null;

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_LINK_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Split inline table rows that were emitted on one line into separate lines. */
export function normalizeMarkdown(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      if (!line.includes("|")) return line;

      const rows = line.match(/\|(?:[^|\n]+\|)+/g);
      if (rows && rows.length > 1) {
        return rows.join("\n");
      }

      return line;
    })
    .join("\n");
}
