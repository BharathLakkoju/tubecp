<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project skills

Apply these on every run:

- [`.cursor/skills/ci-green/SKILL.md`](.cursor/skills/ci-green/SKILL.md): before committing or pushing, and whenever CI fails.
- [`.cursor/skills/transcript-pipeline/SKILL.md`](.cursor/skills/transcript-pipeline/SKILL.md): whenever a change touches knowledge-base builds, transcripts, embeddings, chunk storage, queues, workers or `infra/`.
