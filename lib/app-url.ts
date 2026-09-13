function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "local";
}

function isLocalAppUrl(url: string): boolean {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return isLocalHostname(host);
  } catch {
    return false;
  }
}

/** Public deployments should always use HTTPS, even if env vars were saved with http://. */
function ensureHttpsForPublicHost(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (parsed.protocol === "http:" && !isLocalHostname(parsed.hostname)) {
      parsed.protocol = "https:";
    }
    return normalizeOrigin(parsed.toString());
  } catch {
    return normalizeOrigin(url);
  }
}

function resolveConfiguredAppUrl(): string | null {
  const candidates = [
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.NGROK_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate?.trim()) {
      continue;
    }

    const normalized = ensureHttpsForPublicHost(normalizeOrigin(candidate));
    if (process.env.VERCEL_ENV === "production" && isLocalAppUrl(normalized)) {
      continue;
    }

    return normalized;
  }

  return null;
}

/** Public app URL used for OAuth redirects, Polar checkout, and auth callbacks. */
export function getAppUrl(): string {
  const configured = resolveConfiguredAppUrl();
  if (configured) {
    return configured;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return ensureHttpsForPublicHost(`https://${normalizeOrigin(vercelUrl)}`);
  }

  return "http://localhost:3000";
}

export function getOAuthCallbackUrl(provider: "google" | "github"): string {
  return `${getAppUrl()}/api/auth/callback/${provider}`;
}
