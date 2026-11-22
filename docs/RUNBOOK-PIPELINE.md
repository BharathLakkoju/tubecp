# Pipeline runbook

Knowledge-base builds always write `kb_build_runs` / `kb_video_jobs`. The web app and MCP call one orchestrator. Inngest is the default transport; `KB_PIPELINE=queue` uses SQS + Lambda.

## Stuck in `building`

1. Open the knowledge base. The UI polls `GET /api/knowledge-base/:kbId/build-status` and posts `kick-build` after ~90s without a heartbeat.
2. Confirm a run exists: `SELECT * FROM kb_build_runs WHERE kb_id = '<id>'`.
3. Open jobs: `SELECT video_id, status, error_class, error_message FROM kb_video_jobs WHERE kb_id = '<id>' ORDER BY position`.
4. If the run is `finalizing`, kick-build calls finalize again (Redis write may have failed).
5. If jobs are `queued` on Inngest, kick-build re-sends `kb/build.requested`.
6. If `KB_PIPELINE=queue` and jobs sit in `queued`, check SQS depth and Lambda errors, then kick-build.

## Dead-letter queue

```bash
npm run pipeline:redrive
```

See `scripts/redrive-dlq.ts`. CloudWatch has DLQ alarms; they are not wired to SNS.

## Flip the runner

| `KB_PIPELINE` | Behavior |
| --- | --- |
| unset / anything else | Inngest (`kb/build.requested`) |
| `queue` | SQS fetch + embed queues |
| `admin` | Queue only for `ADMIN_USER_IDS` |

Do not enable `queue` in production without `PIPELINE_FETCH_QUEUE_URL`, `PIPELINE_EMBED_QUEUE_URL`, and `PIPELINE_AWS_ROLE_ARN`. `npm run validate:deploy` checks this.

Inngest keys (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`) stay required for the default path.

## Fairness

Both transports share `kb_build_runs` active-user counts (default 2 active builds per user). A `PIPELINE_FAIRNESS` error means the user must wait for a build to finish.
