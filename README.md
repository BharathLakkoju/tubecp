# YouTube Research Agent

Turn any YouTube research topic into a **chattable knowledge base** — sourced, timestamped, and monetization-ready.

**Stack:** Next.js (Vercel) · Clerk auth · Polar payments · Upstash Redis · Sentry

## Features

| Tier | What's included |
|------|-----------------|
| **Free** | 10 researches/day → ranked video list with relevance scores |
| **Pro ($9/mo)** | 10 KB builds/mo + 200 chat messages/mo + persistent KBs |
| **Researcher ($19/mo)** | 30 KB builds/mo + 600 chats/mo |

## Quick start (local)

```bash
npm install
cp .env.example .env.local
# Fill in: YOUTUBE_API_KEY, OPENROUTER_API_KEY, Clerk keys

npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

### 1. Push to GitHub and import in Vercel

### 2. Environment variables

See `.env.example` for the full list. Required:

| Variable | Source |
|----------|--------|
| `YOUTUBE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai/keys) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | Clerk Dashboard |
| `UPSTASH_REDIS_REST_URL` | [Upstash](https://console.upstash.com) or Vercel Marketplace |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash |
| `POLAR_ACCESS_TOKEN` | [Polar.sh](https://polar.sh) |
| `POLAR_WEBHOOK_SECRET` | Polar → Webhooks |
| `POLAR_PRODUCT_ID_PRO` | Polar → Products |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL |

Optional: `NEXT_PUBLIC_SENTRY_DSN` — see [docs/SETUP-SENTRY.md](docs/SETUP-SENTRY.md)

### 3. Connect services

- **Upstash Redis:** Vercel → Storage → Marketplace → Upstash Redis
- **Clerk:** Add your Vercel domain in Clerk → Domains
- **Polar:** Webhook URL → `https://your-app.vercel.app/api/webhook/polar`

### 4. Create Polar products

1. Polar Dashboard → Products → Create
2. **Pro** — $9/month subscription → copy product ID to `POLAR_PRODUCT_ID_PRO`
3. **Researcher** — $19/month → copy to `POLAR_PRODUCT_ID_RESEARCHER`

## Infrastructure decisions

See [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) for why we use Upstash Redis, Clerk, Polar, and Sentry.

**Verdict:** Upstash is the best free-tier choice for Vercel serverless. Don't switch unless you hit 500k+ Redis commands/month.

## Quality evaluation

No pre-labeled dataset? We included a starter one:

```bash
# List eval topics
npm run eval:dry

# Run full eval (costs API credits)
YOUTUBE_API_KEY=... OPENROUTER_API_KEY=... npm run eval

# Single topic
npm run eval -- --topic ai-saas-monetization
```

Edit `eval/dataset.json` to add topics and adjust `relevanceMin` after manual review.

## Testing

```bash
# Unit + integration tests (Vitest)
npm run test:unit

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# End-to-end tests (Playwright — builds app with E2E_AUTH_BYPASS)
npm run test:e2e

# Full CI suite locally
npm run test:ci
```

**CI** runs on every push/PR via [`.github/workflows/ci.yml`](.github/workflows/ci.yml): unit tests → production build → Playwright E2E.

E2E tests use `E2E_AUTH_BYPASS=true` so they run without real Clerk credentials. To test the real Clerk sign-in UI, set `CLERK_E2E_ENABLED=true` and provide valid Clerk keys before running Playwright.

## API routes (all require Clerk auth except health + webhook)

| Route | Purpose |
|-------|---------|
| `POST /api/research/*` | Search pipeline (free tier) |
| `POST /api/knowledge-base/*` | KB build (paid) |
| `POST /api/chat` | RAG chat (paid) |
| `GET /api/user/subscription` | Plan + usage |
| `GET /api/checkout?plan=pro` | Polar checkout |
| `POST /api/webhook/polar` | Subscription sync |

## MCP (local)

```bash
npm run dev:mcp
```

See `mcp/server.ts` — requires same env vars plus optional `LICENSE_KEY`.

## Project structure

```
app/                  Next.js pages + API routes
components/           UI components
lib/
  billing/            Subscription + usage metering
  services/           YouTube, LLM, KB, chat
  store/              Redis client
docs/                 Setup guides
eval/                 Quality eval dataset
e2e/                  Playwright end-to-end tests
tests/                Vitest unit + integration tests
mcp/                  Local MCP server
scripts/eval.ts       Eval runner
```

## License

MIT
