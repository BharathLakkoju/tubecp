# YouTube Research Agent

Turn any YouTube research topic into a **chattable knowledge base** — sourced, timestamped, and monetization-ready.

**Stack:** Next.js (Vercel) · Auth.js / NextAuth (Google/GitHub) · Neon Postgres · Polar payments · Upstash Redis · Sentry

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
# Fill in: YOUTUBE_API_KEY, OPENROUTER_API_KEY, DATABASE_URL, AUTH_SECRET, OAuth keys

npm run db:migrate   # first time: migrates legacy Better Auth schema (if any) + creates Auth.js tables
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
| `DATABASE_URL` | [Neon](https://neon.tech) Postgres connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | [GitHub Developer Settings](https://github.com/settings/developers) |
| `UPSTASH_REDIS_REST_URL` | [Upstash](https://console.upstash.com) or Vercel Marketplace |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash |
| `POLAR_ACCESS_TOKEN` | [Polar.sh](https://polar.sh) |
| `POLAR_WEBHOOK_SECRET` | Polar → Webhooks |
| `POLAR_PRODUCT_ID_PRO` | Polar → Products |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL |

Optional: `NEXT_PUBLIC_SENTRY_DSN` — see [docs/SETUP-SENTRY.md](docs/SETUP-SENTRY.md)

### 3. Connect services

- **Upstash Redis:** Vercel → Storage → Marketplace → Upstash Redis
- **OAuth:** Set callback URLs to `https://your-app.vercel.app/api/auth/callback/google` and `/api/auth/callback/github`
- **Neon:** Run `npm run db:migrate` after setting `DATABASE_URL`
- **Polar:** Webhook URL → `https://your-app.vercel.app/api/webhook/polar`

### 4. Create Polar products

1. Polar Dashboard → Products → Create
2. **Pro** — $9/month subscription → copy product ID to `POLAR_PRODUCT_ID_PRO`
3. **Researcher** — $19/month → copy to `POLAR_PRODUCT_ID_RESEARCHER`

## Infrastructure decisions

See [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) for why we use Neon Postgres, Upstash Redis, Polar, and Sentry.

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

E2E tests use `E2E_AUTH_BYPASS=true` so they run without real OAuth credentials.

## API routes (all require Auth.js session except health + webhook)

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
