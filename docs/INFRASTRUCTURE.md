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
| Polar | % of revenue only |
| Sentry | $0 (free tier) |
| OpenRouter API | ~$0.02–0.10 per research job |
| YouTube API | $0 (10k units/day free) |

**Expected infra cost before revenue: ~$0–20/month** (mostly Vercel if you need Pro for 60s function timeout).

---

## Recommendation summary

```
Keep:  Neon Postgres + Auth.js + Upstash Redis + Polar + Sentry (free) + Vercel
Skip:  Railway, Render, Fly.io for this app's primary stack
```
