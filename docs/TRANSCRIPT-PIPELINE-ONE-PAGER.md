# TubeCP Transcript Pipeline: Event-Driven Fan-Out Design

Nov 1, 2026 · Bharath Lakkoju · Full decision record: [TRANSCRIPT-PIPELINE.md](./TRANSCRIPT-PIPELINE.md)

## Context and goals

Today's knowledge-base build indexes one video at a time behind a per-KB lock, paced 1.5 to 2 seconds apart, and chains steps with self-calls inside 300-second Vercel functions. Retries sleep inside the function, and a build where every fetch fails ends `failed`. The target is a queue-based pipeline where each video is an independent, idempotent job.

Design targets, not yet measurements:

- First queryable chunk in under 20 seconds at p95.
- A 30-video knowledge base ready in under 60 seconds at p95 when YouTube is reachable.
- Under 1% of videos dead-lettered for any reason other than "no captions".

## Target architecture

Each video becomes one job that moves through two SQS queues, a fetch stage and an embed stage, each consumed by a Lambda worker. Neon Postgres holds one row per `(kb_id, video_id)` job. Messages carry IDs, not transcripts. The last video to reach a terminal state flips the KB to `ready`, or to `failed` if none were indexed. Chunks and vectors stay in the existing Redis store in phase 1 and move to pgvector in phase 2.

## Backpressure

- **YouTube egress:** a shared token bucket in Upstash Redis caps fetches per second per proxy IP. A worker that cannot get a token returns the message with a delay instead of waiting.
- **Embedding provider:** a tokens-per-minute budget gates the embed stage. On a 429 the consumer lowers its concurrency rather than retrying hot.
- **Postgres:** batched inserts, with concurrent writers bounded by Lambda maximum concurrency.
- **Fairness:** each user gets at most 2 active builds and 8 videos in flight.

Workers scale on the age of the oldest message, not queue depth, because depth looks healthy while jobs quietly age.

## Retries and failure handling

SQS delivers at least once, so every stage is idempotent: jobs upsert on `(kb_id, video_id)` and chunks on `(video_id, embedding_model, chunker_version)`.

- **Error classes:** `no_captions` and `invalid_video` are terminal. `blocked`, `rate_limited` and `provider_5xx` are retryable.
- **Backoff:** exponential with jitter on the visibility timeout (5s, 20s, 80s, capped at 5 minutes).
- **Dead letters:** after 5 receives a message moves to a DLQ, which has an alarm and a redrive tool.
- **Retry budget:** retries are capped at 20% of fresh traffic per stage.
- **Circuit breaker:** when the blocked rate crosses a threshold, fetches switch to a hosted transcript API.

## What breaks at 10x

The first limit hit is YouTube access, not compute.

| What breaks | Symptom | Mitigation |
| --- | --- | --- |
| YouTube blocking and rate limits | Block rate climbs, fetch p95 grows, DLQ fills | Global transcript cache, proxy pool sized to the token bucket, circuit breaker |
| Embedding throughput and cost | 429s, spend scales linearly with videos | Batch 64 to 128 chunks per request, token budget, per-plan spend cap, reuse chunks across KBs |
| Vector storage | 1536-dim float4 is about 6 KB per vector, so 10M chunks is about 60 GB before the index | `halfvec`, partition by `kb_id`, dedicated vector store beyond tens of millions |
| Noisy neighbor | One large build delays everyone | Per-user in-flight caps, a separate queue for large builds |
| Hot progress counter | Lock contention on one KB row | Progress from `COUNT` over job rows |
| Duplicate delivery and retry storms | Double charges, duplicate chunks | Idempotency keys, upserts, retry budget |

## Trade-offs and decisions

SQS fits because per-message retries, visibility timeouts and a native DLQ give job semantics with no cluster to run, and no stage needs ordering. Kafka earns its place when other consumers must replay the transcript stream or throughput reaches thousands of messages per second, but retry topics and DLQs then have to be built by hand.

- **Lambda over containers:** jobs are short and bursty. Containers don't avoid YouTube blocking because they also use AWS IPs, so the proxy is needed either way.
- **Transcript API over speech-to-text as the fallback:** downloading audio is blocked just like captions, and costs 10 to 50 times more per video.
- **Upstash free tier is enough** for the token bucket at 10x, at about 10 commands per video.

## Results

To be filled in from the load test and the 30%-blocked failure test.
