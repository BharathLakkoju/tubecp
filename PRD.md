# YouTube Research Agent & MCP — PRD v2

## 1. Product Overview

A research agent that turns a single topic into a **chattable knowledge base** built from real YouTube video transcripts — not just a list of links.

Flow: user enters a topic → agent searches YouTube → ranks candidate videos by genuine topical relevance → transcribes the top 10-20 → combines all transcripts into a unified, embedded knowledge base → user (or any MCP client) can chat with that knowledge base, with every answer traceable back to a specific video and timestamp.

Delivered two ways:
- **Web app** — topic search box, ranked video list, then a paid unlock for transcription + knowledge base + chat.
- **MCP server** — same pipeline exposed as tools, free to search/rank with the user's own API keys, paid to unlock the knowledge-base + chat tools (served from a hosted backend, not reproducible client-side).

---

## 2. Problem

YouTube search ranks on titles, descriptions, and engagement — not on what's actually said inside the video. For research, this means:

- Relevant discussions live inside videos whose titles never mention the topic.
- Nobody has time to watch 10-20 full videos to find the useful five minutes in each.
- Even after finding relevant videos, there's no single place to ask a question and get an answer synthesized *across* all of them.
- Asking an LLM to "research YouTube" from memory gives no real transcript coverage and no verifiable sourcing.

The product solves this in two layers: first by searching and ranking on **spoken content**, then by turning the surviving videos into a single knowledge base you can interrogate directly.

---

## 3. Target User

**Primary:** Developers, AI engineers, researchers, students, technical writers, startup founders, market researchers.

**Initial wedge:** Developers and AI/tech researchers already using Claude, Cursor, or Claude Code — people who'll reach for an MCP tool before a web app.

---

## 4. Core Value Proposition

> **Turn any YouTube research topic into a knowledge base you can talk to — sourced, timestamped, and honest about what it doesn't know.**

Input:
```text
Research how developers are monetizing AI SaaS products in 2026.
Focus on real businesses, revenue, pricing, and customer acquisition.
```

Free-tier output (list only):
```text
47 videos searched → 18 candidates → top 12 ranked

1. Building an AI SaaS to $20K MRR (94% relevance) — Channel X
2. How I Built a $10K/month AI SaaS (91% relevance) — Channel Y
...
[Upgrade to build a knowledge base from these and chat with them]
```

Paid-tier output (after KB build):
```text
Knowledge base ready — 12 videos, 340 min of transcript, 890 chunks indexed.

> Ask: "What pricing models actually worked?"

Most creators converged on usage-based or tiered SaaS pricing between
$29-$99/month rather than one-time sales.

Sources:
— Building an AI SaaS to $20K MRR, 17:21 [watch]
— How I Built a $10K/month AI SaaS, 24:13 [watch]

Gaps: none of the indexed videos discussed enterprise/annual contract
pricing — treat this answer as SMB-focused.
```

---

## 5. Product Architecture

```text
                         USER
                           │
                           ▼
                   RESEARCH AGENT
                           │
                           ▼
                     MCP / API LAYER
                           │
        ┌──────────┬───────┴────────┬─────────────┐
        ▼           ▼                ▼             ▼
    YouTube     Transcript       Ranking       Embedding /
     Search      Provider        Engine        KB Builder
        │           │                │             │
        └───────────┴───────┬────────┴─────────────┘
                             ▼
                 GLOBAL CONTENT CACHE
              (video_id-keyed transcripts,
               embeddings, relevance scores)
                             │
                             ▼
                  PostgreSQL + pgvector
                             │
                     ┌───────┴───────┐
                     ▼               ▼
              Ranked List Out    Chat / RAG
               (free tier)      Serving Layer
                                 (paid tier)
```

The **global content cache** is the key architectural addition over v1 — see §13.

---

## 6. MCP Server

### Tool 1: `search_youtube` *(free / BYOK)*
Search YouTube for candidate videos.

```typescript
Input:  { query: string; maxResults?: number; publishedAfter?: string; publishedBefore?: string; }
Output: { videos: { videoId, title, channel, url, publishedAt, duration?, description? }[] }
```

### Tool 2: `get_transcript` *(free / BYOK)*
```typescript
Input:  { videoId: string; }
Output: { videoId, language, segments: { start, duration, text }[] }
```

### Tool 3: `analyze_video` *(free / BYOK)*
Determine whether a video meaningfully discusses the topic.
```typescript
Input:  { videoId: string; topic: string; }
Output: { relevanceScore, discussesTopic, summary, evidence: { timestamp, text, relevance }[] }
```

### Tool 4: `research_youtube` *(free / BYOK — returns list only)*
The primary discovery tool. Runs query expansion, search, dedup, and ranking; returns the **top 10-20 videos** with relevance scores and one-line justifications. Does **not** transcribe beyond what's needed to score relevance, and does not build a knowledge base.

```typescript
Input:  { topic: string; maxVideos?: number; dateRange?: { from?, to? }; language?: string; }
Output: { queriesUsed: string[]; videosSearched: number; rankedVideos: { videoId, title, url, relevanceScore, whyRelevant }[] }
```

### Tool 5: `build_knowledge_base` *(paid — requires hosted license key)*
Takes the ranked list (or a topic directly), transcribes every video fully, chunks, embeds, and stores a queryable knowledge base. This tool calls **your hosted backend**, not the user's own keys — the license key is what unlocks it, regardless of whether the user supplies their own YouTube/LLM keys elsewhere.

```typescript
Input:  { topic: string; videoIds?: string[]; licenseKey: string; }
Output: { kbId: string; videosIndexed: number; chunksIndexed: number; status: "ready" | "building"; }
```

### Tool 6: `chat_with_knowledge_base` *(paid — requires hosted license key)*
```typescript
Input:  { kbId: string; message: string; licenseKey: string; }
Output: { answer: string; sources: { videoId, title, timestamp, url }[]; gaps?: string; }
```

---

## 7. Research Agent Workflow

```text
User topic
    ↓
Understand research objective
    ↓
Generate multiple search queries (query expansion)
    ↓
Search YouTube
    ↓
Deduplicate videos
    ↓
Check global cache — skip re-fetch/re-embed for known video IDs
    ↓
Retrieve transcripts (cache-first, fetch/transcribe on miss)
    ↓
Semantic relevance search + LLM verification
    ↓
Rank videos → return top 10-20                      ← FREE TIER STOPS HERE
    ↓                                                    (both web + MCP)
─────────────────────────────────────────────────────────────────────
    ↓                                                 PAID TIER CONTINUES
Chunk transcripts across all ranked videos
    ↓
Generate embeddings (cache-first)
    ↓
Build unified vector index (the knowledge base)
    ↓
Serve chat: retrieval → grounded answer → cited sources → gap flagging
```

---

## 8. Query Expansion

Unchanged from v1 — the agent generates multiple search strategies per topic rather than a single literal query, to surface videos whose titles don't contain the topic verbatim.

```text
Original: "AI SaaS monetization"
Expanded: "AI SaaS revenue" / "AI SaaS MRR" / "AI SaaS business model" /
          "AI startup revenue" / "building AI SaaS business" / "AI SaaS pricing"
```

Cache expanded-query → candidate-video-ID mappings for 24-48h so duplicate topic searches within that window don't re-burn YouTube quota.

---

## 9. Relevance Engine

Pipeline unchanged from v1:

```text
Transcript → chunk → embeddings → vector similarity → top sections →
LLM verification → final relevance score
```

Suggested weighting: 40% semantic relevance, 20% topic coverage, 20% discussion depth, 10% evidence quality, 10% source quality.

Distinguish **Mentioned** vs. **Briefly discussed** vs. **Substantially discussed** — only the latter two appear in the ranked list.

This scoring only needs enough transcript access to judge relevance (can use captions/preview chunks), not a full deep transcription pass — keep this step cheap, since it runs on every free-tier request.

---

## 10. Knowledge Base Construction *(new — paid tier)*

Once a video set is confirmed (top 10-20 from the free ranking, or user-selected subset):

1. Fetch full transcripts for every video in the set (cache-first).
2. Chunk each transcript into overlapping windows (~150-300 words), tagged with `videoId`, `timestamp`, `title`, `channel`.
3. Embed every chunk; store in pgvector alongside existing chunks for that `videoId` if already cached (never re-embed a video that's been processed before).
4. Build a `kbId` that references the set of chunk IDs belonging to this research job — the underlying chunks are shared/reused across knowledge bases; the KB itself is just a pointer set plus metadata.
5. Default to **ephemeral**: a KB lives for the session / a bounded window (e.g., 24-72h) unless the user is on a tier that includes saved/persistent research.

This decoupling (shared cached chunks, disposable KB pointers) is what keeps storage cost from growing linearly with number of research jobs.

---

## 11. Chat / Q&A Interface *(new — paid tier)*

- Every chat turn: retrieve top-k chunks across the KB's videos → generate a grounded answer → cite `{video title, timestamp, url}` for every claim.
- If retrieval confidence is low for a question, say so explicitly rather than answering from general LLM knowledge — carry the original PRD's "Gaps" discipline into the chat interface itself, not just the static report.
- Chat usage is the primary recurring/variable cost in this product — meter it (see §16), don't treat it as a flat-cost feature.

---

## 12. Research Report *(retained as a mid-tier deliverable)*

For users who want a one-shot artifact rather than an ongoing chat session, the agent can still produce the original four-section report — cheaper to deliver once than to keep a KB alive indefinitely:

- **Sources** — ranked videos
- **Evidence** — key timestamps and excerpts
- **Findings** — patterns across videos
- **Gaps** — topics with insufficient evidence

---

## 13. Cost Architecture (this is a design constraint, not an afterthought)

**Global content cache, keyed by `videoId`** — not by user, not by topic. Transcripts, chunk embeddings, and even relevance judgments for a given video/topic-pair are cached indefinitely and reused across every user whose research touches that video. As the video library grows, an increasing share of any new job's videos are already fully processed, driving marginal compute cost toward zero over time.

Where cost actually concentrates:
| Stage | Cost driver | Mitigation |
|---|---|---|
| YouTube search | 100 quota units/call × several expanded queries per job | Cache query→candidate mappings 24-48h; rate-limit free tier per user/IP |
| Transcription | Cheap when captions exist; ASR fallback (~$0.006/min) when they don't | Cache by video ID forever; prefer caption-first providers |
| Embeddings | Cheap per-token even at volume | Cache by video ID; never re-embed |
| Chat | Recurring, usage-correlated, the real variable cost | Meter with credits, not flat-unlimited |
| KB storage | Grows with number of *persisted* KBs | Ephemeral by default; persistence is a paid add-on |

---

## 14. Technology Stack

- **MCP:** TypeScript, MCP TypeScript SDK
- **Backend:** Node.js / TypeScript
- **Database:** PostgreSQL (Supabase to start)
- **Vector search:** pgvector
- **LLM:** OpenRouter initially; provider stays swappable
- **YouTube:** YouTube Data API for search; pluggable transcript provider (official captions → alternative extraction → ASR fallback)
- **Licensing (new):** a lightweight license-key service gating `build_knowledge_base` / `chat_with_knowledge_base` in the MCP, shared with the web app's paid-tier auth

---

## 15. Performance Requirements

Free tier (list only):
```text
Candidate videos: 30-100
Target response time: <30 seconds
```

Paid tier (KB build):
```text
Videos indexed: 10-20
Target build time: <3 minutes (streamed progress)
```

Chat responses: target <5 seconds per turn.

---

## 16. Quality Requirements

Retained from v1 — precision over quantity. A match doesn't count just because a title/description/keyword matches or the topic is mentioned once; it requires meaningful discussion.

Added for the chat layer: **every answer must be grounded and cited.** An answer with no supporting chunk above a confidence threshold should say so rather than filling the gap from general knowledge — this matters more once users can ask anything, not just receive a curated report.

Target benchmarks (measured against a manually labelled test set):
```text
>80% of returned videos genuinely relevant
>70% of extracted timestamps genuinely useful
>90% of chat answers correctly cited to a real, relevant source
```

---

## 17. Monetization

### Channel 1 — Web App
- **Free:** enter a topic → get the ranked top 10-video list with relevance scores. Nothing else.
- **Paid:** unlocks knowledge-base build + persistent chat for that research job.

### Channel 2 — MCP (BYOK)
- **Free:** `search_youtube`, `get_transcript`, `analyze_video`, `research_youtube` (list only) — works entirely on the user's own YouTube/LLM keys, no dependency on your infra.
- **Paid:** `build_knowledge_base` and `chat_with_knowledge_base` — call your hosted backend regardless of the user's own keys, gated by a license key. This is where the actual differentiated pipeline (caching, cross-video ranking, chunking strategy) lives, so it isn't trivially reproducible even by someone with their own API keys.

### Suggested pricing (credit-based, not flat-unlimited, given chat is the variable cost)
| Plan | Price | Included |
|---|---|---|
| Free | $0 | Unlimited ranked lists (rate-limited); 0 KB builds |
| Pro | $9/mo | 10 KB builds/mo + 200 chat messages/mo |
| Researcher | $19/mo | 30 KB builds/mo + 600 chat messages/mo, saved/persistent KBs |
| Power | $39/mo | 100 KB builds/mo + 2000 chat messages/mo, saved KBs, export to Markdown/PDF |

Overage billed per credit rather than throttled, once usage patterns are understood.

Future monetization (unchanged from v1): hosted MCP, team research, research history, custom research agents, higher-volume API plans.

---

## 18. Competitive Positioning

Not:
> "A YouTube MCP."

Also not just:
> "AI-powered research across YouTube transcripts."

Now:
> **"A research copilot that turns hours of YouTube into a knowledge base you can actually talk to — and that tells you what it doesn't know."**

```text
Normal YouTube search → find videos
Our v1 product        → find relevant discussions → find evidence → generate a report
Our v2 product        → do all of the above → build a knowledge base → let you chat with it
```

---

## 19. Success Metrics

Carried over from v1, plus cost-awareness metrics now that a chat layer exists:

- **Discovery quality** — genuinely relevant videos found that plain YouTube search misses
- **Research time saved**
- **Accuracy** — relevance scores, timestamps, and chat citations all correct
- **Repeat usage** — the most important metric, unchanged
- **Willingness to pay**
- **New: cache hit rate** — % of videos in a new job already cached from prior jobs (the leading indicator of whether marginal cost is actually trending down)
- **New: cost per completed KB build and per chat message** — track margin directly, not just revenue

---

## 20. Validation Plan

Unchanged in spirit from v1, with the KB/chat layer validated separately before scaling:

1. Build the free list-ranking pipeline. Validate against 20-30 real research questions.
2. Manually build one KB end-to-end (even without full automation) and chat against it — validate that grounded, cited answers are actually good before investing in the automated pipeline.
3. Automate KB build + chat as MCP tools.
4. Give it to 10-20 developers/researchers; measure repeat usage and willingness to pay.
5. Only then build the commercial billing/licensing layer.

---

## 21. Future Product

```text
                 Research Agent
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
     YouTube        Web Search       Reddit
        │              │              │
        └──────────────┼──────────────┘
                       ▼
              Unified Knowledge Base
                       │
                       ▼
                  Chat Interface
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
           PDF       Notion    Markdown
```

YouTube remains the first research source, not the final scope.

---

## 22. Initial Development Milestone

```text
Milestone 1 (cheap, validate first):
  research_youtube("How developers make money from AI SaaS")
  → ranked list of 10-20 videos with relevance scores and justifications

Milestone 2 (expensive, validate before automating):
  Manually build one knowledge base from Milestone 1's output and chat
  against it — confirm grounded, cited answers are actually good

Milestone 3:
  Automate build_knowledge_base + chat_with_knowledge_base as MCP tools,
  backed by the global content cache

Milestone 4:
  Expose both channels (web app + MCP) with licensing/billing
```

Only after Milestone 2 proves the chat quality is worth paying for should the commercial layer get built.
