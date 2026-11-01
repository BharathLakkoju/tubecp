---
name: ci-green
description: Verifies TubeCP changes against the same checks GitHub Actions runs (Vitest, production build, Playwright E2E) and confirms the remote CI run is green after pushing. Use before committing, pushing, opening or updating a PR, or when CI checks fail.
---

# Keep CI green

CI is `.github/workflows/ci.yml`: unit tests, then production build, then Playwright E2E. All three must pass on every push.

## Before committing

Run, in order, and stop at the first failure:

```bash
npm run check      # tsc --noEmit + Vitest
npm run build
npm run test:e2e   # builds and serves on port 3100 with E2E_AUTH_BYPASS and E2E_STUB_APIS
```

If Playwright reports a missing browser executable, run `npx playwright install chromium` and retry. Database connection errors from the web server log are expected locally without Postgres and don't fail tests.

## After pushing

```bash
gh run list --branch <branch> --limit 1
gh run view <run-id> --log-failed
```

Report the run's result to the user. A change is not done while its CI run is failing.

## When a test fails

1. Decide whether the code or the test is wrong. Check `git log` for intentional UI or copy changes before editing a test.
2. If the UI changed on purpose, update the test to assert the new behavior, including link targets, not just visible text.
3. Never delete a test, add `.skip`, or loosen an assertion only to make CI pass.
