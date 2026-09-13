# Production deploy checklist (OPS-01)

Use this checklist before and after every production deploy.

## 1. Pre-deploy (local or CI)

Validate environment variables from `.env.local` or your shell:

```bash
# Load production values, then validate
NODE_ENV=production npm run validate:deploy
```

The script exits `0` when all required production variables are set and dev bypass flags are disabled.

### Required variables

| Variable | Purpose |
|----------|---------|
| `YOUTUBE_API_KEY` | YouTube search |
| `OPENROUTER_API_KEY` | LLM + embeddings |
| `DATABASE_URL` | Neon Postgres |
| `AUTH_SECRET` | Session signing |
| `NEXT_PUBLIC_APP_URL` | OAuth + checkout redirects |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limits + cache |
| `RESEND_API_KEY` / `EMAIL_FROM` | Verification + password reset — [SETUP-RESEND.md](./SETUP-RESEND.md) |
| `GOOGLE_*` or `GITHUB_*` OAuth | Sign-in |
| `POLAR_ACCESS_TOKEN` / `POLAR_WEBHOOK_SECRET` | Billing |
| `POLAR_PRODUCT_ID_PRO` | Pro checkout |

### Recommended

| Variable | Purpose |
|----------|---------|
| `POLAR_PRODUCT_ID_RESEARCHER` | Researcher tier on pricing |
| `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Legal/support pages |
| `YOUTUBE_DAILY_QUOTA_LIMIT` | Quota alert threshold (default 10000) |

### Never enable in production

- `E2E_AUTH_BYPASS`
- `DEV_BYPASS_USAGE_LIMITS`

## 2. Deploy steps

1. `npm run validate:deploy` with production env
2. `npm run db:migrate` (if schema changed)
3. Deploy to Vercel
4. Confirm OAuth callback URLs match `NEXT_PUBLIC_APP_URL`
5. Confirm Polar webhook URL points to `/api/webhook/polar`

## 3. Post-deploy smoke test

After deploy, verify the live app:

```bash
npm run smoke:production -- --url https://your-app.vercel.app
```

This checks:

- `GET /`, `/pricing`, `/sign-in` return 200
- `GET /api/health` returns `status: "ok"`
- Remote config flags (API keys, Redis, Resend, Polar products)
- YouTube quota is below the warning threshold

## 4. Health endpoint

`GET /api/health` returns:

```json
{
  "status": "ok",
  "platform": "vercel-serverless",
  "checks": {
    "youtubeKey": true,
    "openrouterKey": true,
    "resendKey": true,
    "emailFrom": true,
    "kv": true,
    "databaseUrl": true,
    "authSecret": true,
    "appUrl": true,
    "polarAccessToken": true,
    "polarWebhookSecret": true,
    "polarProProduct": true,
    "polarResearcherProduct": false,
    "googleOAuth": true,
    "githubOAuth": false,
    "oauthProvider": true,
    "devBypassDisabled": true,
    "youtubeQuota": { "used": 0, "limit": 10000, "warning": false }
  }
}
```

`status` is `degraded` when required runtime checks fail (missing keys, Redis unreachable, quota warning).

## 5. Quick manual checks

- [ ] Sign in with Google/GitHub
- [ ] Run one research query
- [ ] Upgrade flow opens Polar checkout (Pro)
- [ ] Password reset email sends (credentials users)
