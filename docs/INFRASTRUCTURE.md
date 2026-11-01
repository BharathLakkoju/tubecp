# Infrastructure Choices — Verdict

## Upstash Redis — **Recommended (keep it)**

For this app's serverless Vercel deployment, **Upstash Redis is the right choice**.

### Why Upstash wins for this project

| Requirement | Upstash | Alternatives |
|-------------|---------|--------------|
| Serverless-compatible (HTTP, no TCP) | ✅ Native | Redis Cloud TCP: ❌ on Vercel |
| Vercel integration | ✅ One-click Marketplace | Self-hosted: ❌ |
| Rate limiting | ✅ `@upstash/ratelimit` same DB | Separate service needed |
| Free tier | ✅ **500k commands/mo**, 256 MB | Vercel KV: deprecated wrapper |
| Cost at scale | ~$0.2 per 100k commands | Neon Postgres: overkill for KV |
| Embedding/chunk storage | ✅ JSON blobs work fine | Turso: SQLite, awkward for vectors |

### Free tier (as of 2026)

- **500,000 commands/month** (not 10k — they increased this)
- **256 MB** storage
- **10 GB** monthly bandwidth
- Enough for hundreds of research jobs + KB builds per month on a new product

### What we use it for

```
transcript:{videoId}     → cached captions (global, shared across users)
chunk:{id}               → transcript chunks + embeddings
kb:{kbId}                → knowledge base metadata
user-kbs:{userId}        → list of user's knowledge bases (Redis)
user-kbs:{userId}        → list of user's knowledge bases
queries:{hash}           → query expansion cache (48h TTL)
rl:*                     → rate limit counters
```

### When to upgrade

Upgrade to Upstash **Pay-as-you-go** ($0.2/100k commands) when:
- You exceed 500k commands/month
- Storage exceeds 256 MB (many cached transcripts)
- You need multi-region replication

At that point you're likely making revenue — the cost is negligible vs OpenRouter API spend.

---

## Alternatives considered

### Vercel KV
- **Verdict:** Deprecated for new projects. It was a wrapper around Upstash anyway. Don't use.

### Turso (libSQL)
- **Verdict:** Great for relational data, but this app stores JSON blobs and doesn't need SQL joins. Would add complexity without benefit.

### Neon Postgres — **In use**
- **Verdict:** Stores Auth.js users/sessions and application subscription data (`user_subscriptions`: plan, usage counters, billing period, Polar references). Neon serverless driver works on Vercel.

### PlanetScale / Railway Redis
- **Verdict:** Requires always-on infra or TCP connections. Conflicts with pure Vercel serverless. More expensive for this use case.

### Pinecone / Upstash Vector
- **Verdict:** Dedicated vector DB is overkill for 10–20 videos per KB (~500 chunks). In-memory cosine similarity on Redis-stored embeddings works fine until ~10k chunks per query.

---

## AWS transcript pipeline

**Status:** In progress on `feature/event-driven-transcript-pipeline`. Design: [TRANSCRIPT-PIPELINE.md](./TRANSCRIPT-PIPELINE.md).

Knowledge-base builds move off self-calling Vercel functions onto two Amazon SQS queues (fetch, embed) with AWS Lambda workers. Neon Postgres stores one job row per video. Upstash Redis keeps chunks and vectors in phase 1 and adds a token bucket for YouTube traffic. Vercel stays the web tier and authenticates to AWS with OIDC, so no long-lived AWS keys are stored.

Lambdas run outside a VPC and connect to Neon through the serverless driver, which avoids a NAT gateway (about $32 per month) and RDS Proxy.

### Estimated monthly cost

Assumes an average video of about 20 minutes, about 1.5 MB of proxy traffic per video, and about 10% of videos using the transcript API fallback. Prices are list prices to verify before budgeting.

| | 3,000 videos | 30,000 videos | 300,000 videos |
|---|---|---|---|
| AWS (Lambda, SQS, CloudWatch) | $1–3 | $3–6 | $20–30 |
| Residential proxy | ~$20 | $150–350 | $1,350–2,250 |
| Transcript API fallback | $0–20 | $6–30 | ~$90 |
| Embeddings | <$1 | ~$3 | ~$30 |
| Neon (job rows now, pgvector in phase 2) | $5–15 | $20–50 | $70–170 |
| Upstash | $0 | $0–2 | $6–10 |
| **Total** | **$30–60** | **$270–430** | **$1.6k–2.6k** |

The proxy is about 90% of the cost per video at every scale, so the levers that matter are transcript cache hits and fetching less data per video, not the choice of queue.

---

## Auth.js (NextAuth) — **In use**

- Self-hosted auth with Google and GitHub OAuth
- User/session data in Neon Postgres
- No third-party auth vendor lock-in

---

## Polar.sh — **Recommended**

- Merchant of record (handles VAT/tax globally)
- Lower friction than Stripe for solo SaaS
- Native Next.js SDK + webhooks
- Sandbox mode for testing

---

## Sentry — **Recommended (free tier)**

- Developer plan: **$0**, 5k errors/month
- See [SETUP-SENTRY.md](./SETUP-SENTRY.md) for setup

---

## Total monthly cost at launch (estimated)

| Service | Cost |
|---------|------|
| Vercel Hobby/Pro | $0–20 |
| Upstash Redis | $0 (free tier) |
| Neon Postgres | $0 (free tier) |
| AWS (SQS + Lambda transcript pipeline) | $1–3 at launch volume |
| Polar | % of revenue only |
| Sentry | $0 (free tier) |
| OpenRouter API | ~$0.02–0.10 per research job |
| YouTube API | $0 (10k units/day free) |

**Expected infra cost before revenue: ~$0–20/month** (mostly Vercel if you need Pro for 60s function timeout).

---

## Recommendation summary

```
Keep:  Neon Postgres + Auth.js + Upstash Redis + Polar + Sentry (free) + Vercel
Add:   AWS SQS + Lambda for the knowledge-base transcript pipeline
Skip:  Railway, Render, Fly.io for this app's primary stack
```
