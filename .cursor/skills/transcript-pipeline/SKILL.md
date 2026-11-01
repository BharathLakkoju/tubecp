---
name: transcript-pipeline
description: Invariants and verification checklist for the TubeCP knowledge-base transcript pipeline (SQS fetch and embed queues, Lambda workers, kb_video_jobs in Postgres, token bucket in Upstash, CDK stack in infra/). Use when changing knowledge-base builds, transcript fetching, embeddings, chunk storage, queues, workers, retries, DLQs, rate limits, or anything under infra/.
---

# Transcript pipeline

The design is in `docs/TRANSCRIPT-PIPELINE.md` (decisions) and `docs/TRANSCRIPT-PIPELINE-ONE-PAGER.md` (reviewer summary). Read the decision record before changing behavior it describes. If a change contradicts it, update the doc in the same change.

## Invariants

Every change must keep all of these true:

1. **One job per `(kb_id, video_id)`.** Job writes are upserts on that key. A second delivery of the same message must change nothing.
2. **Chunks are idempotent.** Chunk writes are keyed on `(video_id, embedding_model, chunker_version)`. Re-indexing a video never duplicates chunks or charges usage twice.
3. **Messages carry IDs only** (`kbId`, `videoId`, `attempt`, optional `userId`). Never put transcripts, chunks or embeddings in a message.
4. **Workers never sleep to retry.** A retryable failure changes the message visibility timeout (5s, 20s, 80s with jitter, capped at 5 minutes) and returns. No `setTimeout` waits in worker code.
5. **Error classes are explicit.** `no_captions` and `invalid_video` are terminal (`skipped`). `blocked`, `rate_limited`, `provider_5xx` and `provider_429` are retryable. New errors must be mapped to one class, defaulting to retryable.
6. **The KB row is written only on terminal transitions.** Progress comes from `COUNT` over `kb_video_jobs`. Never increment a counter on the KB record per video.
7. **Completion is atomic.** The worker that moves the last open job to a terminal state flips the KB to `ready` (or `failed` when nothing was indexed) in the same transaction.
8. **Backpressure goes through the shared limits.** YouTube fetches take a token from the Redis bucket first. Per-user caps (2 active builds, 8 videos in flight) are enforced before enqueueing. Don't add a bypass path.
9. **No long-lived AWS keys.** Vercel reaches AWS through OIDC role assumption. Lambdas stay outside a VPC and use the Neon serverless driver.
10. **Both paths keep working until the flag is removed.** `KB_PIPELINE=legacy` must still build KBs through the old chain until rollout step 4 in the decision record.

## Verification checklist

Copy this and complete it before handing back:

```
- [ ] Invariants 1-10 still hold for the changed code
- [ ] Unit tests cover new behavior: duplicate delivery, each error class, last-job completion
- [ ] npm run check passes (typecheck + Vitest)
- [ ] npm run build passes
- [ ] npm run test:e2e passes (uses E2E_STUB_APIS, no real AWS)
- [ ] If infra/ changed: cd infra && npx cdk synth succeeds
- [ ] Docs updated if behavior, limits or costs changed
```

## Where things live

| Concern | Location |
| --- | --- |
| Current (legacy) build chain | `lib/services/kb-build-job.ts`, `kb-build-continue.ts`, `kb-build-lock.ts` |
| Transcript fetch and error kinds | `lib/services/transcript.ts`, `youtube-caption-fetch.ts` |
| Chunking and embedding | `lib/services/knowledge-base.ts`, `lib/services/llm.ts` |
| Chunk and vector storage (phase 1) | `lib/store.ts`, `lib/store/vector-index.ts` |
| Postgres schema | `lib/db/schema.sql`, applied by `npm run db:migrate` |
| E2E stubs | `lib/e2e-stub.ts` |
