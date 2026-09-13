function isProductionEnv(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
}

export type DeployCheck = {
  id: string;
  label: string;
  required: boolean;
  passed: boolean;
  detail?: string;
};

export type DeployValidationResult = {
  checks: DeployCheck[];
  ready: boolean;
  errors: DeployCheck[];
  warnings: DeployCheck[];
};

function isSet(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function hasOAuthProvider(env: NodeJS.ProcessEnv): boolean {
  const google = isSet(env.GOOGLE_CLIENT_ID) && isSet(env.GOOGLE_CLIENT_SECRET);
  const github = isSet(env.GITHUB_CLIENT_ID) && isSet(env.GITHUB_CLIENT_SECRET);
  return google || github;
}

export function runDeployChecks(env: NodeJS.ProcessEnv = process.env): DeployValidationResult {
  const production = isProductionEnv(env);

  const checks: DeployCheck[] = [
    {
      id: "youtube_api_key",
      label: "YOUTUBE_API_KEY",
      required: true,
      passed: isSet(env.YOUTUBE_API_KEY),
    },
    {
      id: "openrouter_api_key",
      label: "OPENROUTER_API_KEY",
      required: true,
      passed: isSet(env.OPENROUTER_API_KEY),
    },
    {
      id: "database_url",
      label: "DATABASE_URL",
      required: true,
      passed: isSet(env.DATABASE_URL),
    },
    {
      id: "auth_secret",
      label: "AUTH_SECRET",
      required: true,
      passed: isSet(env.AUTH_SECRET),
    },
    {
      id: "app_url",
      label: "NEXT_PUBLIC_APP_URL or AUTH_URL",
      required: true,
      passed: isSet(env.NEXT_PUBLIC_APP_URL) || isSet(env.AUTH_URL),
    },
    {
      id: "upstash_redis",
      label: "UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN",
      required: true,
      passed: isSet(env.UPSTASH_REDIS_REST_URL) && isSet(env.UPSTASH_REDIS_REST_TOKEN),
    },
    {
      id: "resend_api_key",
      label: "RESEND_API_KEY",
      required: production,
      passed: isSet(env.RESEND_API_KEY),
      detail: production ? undefined : "Optional in local development",
    },
    {
      id: "email_from",
      label: "EMAIL_FROM",
      required: production,
      passed: isSet(env.EMAIL_FROM),
      detail: production ? undefined : "Optional in local development",
    },
    {
      id: "oauth_provider",
      label: "Google or GitHub OAuth credentials",
      required: true,
      passed: hasOAuthProvider(env),
    },
    {
      id: "polar_access_token",
      label: "POLAR_ACCESS_TOKEN",
      required: true,
      passed: isSet(env.POLAR_ACCESS_TOKEN),
    },
    {
      id: "polar_webhook_secret",
      label: "POLAR_WEBHOOK_SECRET",
      required: true,
      passed: isSet(env.POLAR_WEBHOOK_SECRET),
    },
    {
      id: "polar_product_pro",
      label: "POLAR_PRODUCT_ID_PRO",
      required: true,
      passed: isSet(env.POLAR_PRODUCT_ID_PRO),
    },
    {
      id: "polar_product_researcher",
      label: "POLAR_PRODUCT_ID_RESEARCHER",
      required: false,
      passed: isSet(env.POLAR_PRODUCT_ID_RESEARCHER),
      detail: "Optional — hides Researcher tier on pricing when unset",
    },
    {
      id: "e2e_bypass_disabled",
      label: "E2E_AUTH_BYPASS disabled",
      required: production,
      passed: !production || env.E2E_AUTH_BYPASS !== "true",
    },
    {
      id: "usage_bypass_disabled",
      label: "DEV_BYPASS_USAGE_LIMITS disabled",
      required: production,
      passed: !production || env.DEV_BYPASS_USAGE_LIMITS !== "true",
    },
    {
      id: "sentry_dsn",
      label: "NEXT_PUBLIC_SENTRY_DSN",
      required: false,
      passed: isSet(env.NEXT_PUBLIC_SENTRY_DSN),
      detail: "Recommended for production error monitoring",
    },
    {
      id: "support_email",
      label: "NEXT_PUBLIC_SUPPORT_EMAIL",
      required: false,
      passed: isSet(env.NEXT_PUBLIC_SUPPORT_EMAIL),
      detail: "Shown on legal and support pages",
    },
  ];

  const errors = checks.filter((check) => check.required && !check.passed);
  const warnings = checks.filter((check) => !check.required && !check.passed);

  return {
    checks,
    ready: errors.length === 0,
    errors,
    warnings,
  };
}

export type RemoteHealthPayload = {
  status: "ok" | "degraded";
  platform?: string;
  checks?: Record<string, unknown>;
};

export function validateRemoteHealth(payload: RemoteHealthPayload): DeployValidationResult {
  const checks: DeployCheck[] = [
    {
      id: "health_status",
      label: "Health status is ok",
      required: true,
      passed: payload.status === "ok",
      detail: payload.status === "degraded" ? "Deployment is degraded" : undefined,
    },
    {
      id: "health_platform",
      label: "Health platform metadata present",
      required: true,
      passed: payload.platform === "vercel-serverless",
    },
  ];

  const remote = payload.checks ?? {};
  const remoteKeys: Array<{ id: string; label: string; required: boolean }> = [
    { id: "youtubeKey", label: "YouTube API key configured", required: true },
    { id: "openrouterKey", label: "OpenRouter API key configured", required: true },
    { id: "databaseUrl", label: "Database URL configured", required: true },
    { id: "authSecret", label: "Auth secret configured", required: true },
    { id: "appUrl", label: "App URL configured", required: true },
    { id: "kv", label: "Upstash Redis connected", required: true },
    { id: "resendKey", label: "Resend API key configured", required: true },
    { id: "emailFrom", label: "Email sender configured", required: true },
    { id: "oauthProvider", label: "OAuth provider configured", required: true },
    { id: "polarAccessToken", label: "Polar access token configured", required: true },
    { id: "polarWebhookSecret", label: "Polar webhook secret configured", required: true },
    { id: "polarProProduct", label: "Polar Pro product configured", required: true },
    { id: "polarResearcherProduct", label: "Polar Researcher product configured", required: false },
    { id: "devBypassDisabled", label: "Dev bypass flags disabled", required: true },
  ];

  for (const item of remoteKeys) {
    checks.push({
      id: `remote_${item.id}`,
      label: item.label,
      required: item.required,
      passed: Boolean(remote[item.id]),
    });
  }

  const quota = remote.youtubeQuota as { warning?: boolean } | undefined;
  if (quota) {
    checks.push({
      id: "remote_youtube_quota",
      label: "YouTube quota below warning threshold",
      required: true,
      passed: !quota.warning,
      detail: quota.warning ? "YouTube daily quota is above 80%" : undefined,
    });
  }

  const errors = checks.filter((check) => check.required && !check.passed);
  const warnings = checks.filter((check) => !check.required && !check.passed);

  return {
    checks,
    ready: errors.length === 0,
    errors,
    warnings,
  };
}
