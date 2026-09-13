# Sentry Setup Guide (Step-by-Step)

Sentry has a **free Developer plan** — 5,000 errors/month, 1 project, 10M performance units. That's enough for early production. You only pay if you exceed free limits.

---

## Step 1: Create a Sentry account

1. Go to [https://sentry.io/signup/](https://sentry.io/signup/)
2. Sign up (GitHub login works)
3. Choose the **Developer** (free) plan when prompted

---

## Step 2: Create a project

1. After signup, Sentry asks you to **Create a project**
2. Select platform: **Next.js**
3. Set alert frequency: **Alert me on every new issue** (recommended for early stage)
4. Name it: `youtube-research-agent`
5. Click **Create Project**

Sentry shows a setup wizard with a DSN — copy it. It looks like:

```
https://abc123@o123456.ingest.us.sentry.io/7890123
```

---

## Step 3: Add environment variables

### Local development

Add to `.env.local`:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o123456.ingest.us.sentry.io/7890123
```

### Vercel production

1. Vercel Dashboard → your project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `NEXT_PUBLIC_SENTRY_DSN`
   - **Value:** your DSN from Step 2
   - **Environments:** Production, Preview (optional)
3. Click **Save**
4. **Redeploy** your app for the variable to take effect

---

## Step 4: Verify the integration

This project already includes:

- `instrumentation.ts` — loads Sentry on server/edge start
- `instrumentation-client.ts` — client-side error capture (Web Vitals disabled to avoid CLS reporter crashes)
- `sentry.server.config.ts` — server-side error capture
- `sentry.edge.config.ts` — edge runtime capture
- `app/global-error.tsx` — captures React render crashes

### Test locally

1. Start the app: `npm run dev`
2. Temporarily add a test route or visit an API that throws
3. Or trigger a client error in the browser console:

```javascript
throw new Error("Sentry test error");
```

4. Go to Sentry Dashboard → **Issues** — you should see the error within ~30 seconds

### Test on Vercel

1. Deploy with `NEXT_PUBLIC_SENTRY_DSN` set
2. Visit your production URL and trigger an error
3. Check Sentry Issues tab

---

## Step 5: Configure alerts (recommended)

1. Sentry → **Alerts** → **Create Alert**
2. Choose **Issues** → **Send a notification for high priority issues**
3. Connect **Email** or **Slack**
4. Save

For a solo founder, email alerts on new issues are enough.

---

## Step 6: Optional — source maps (better stack traces)

Source maps make production errors show your actual TypeScript line numbers.

### Option A: Sentry Wizard (easiest)

```bash
npx @sentry/wizard@latest -i nextjs
```

Follow prompts. It updates `next.config.ts` and adds auth token env vars.

### Option B: Manual

1. Sentry → **Settings** → **Auth Tokens** → Create token with `project:releases` scope
2. Add to Vercel env:

```bash
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=youtube-research-agent
```

3. Wrap `next.config.ts` with `withSentryConfig` (see [Sentry Next.js docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/))

---

## Step 7: What gets captured automatically

| Event | Captured? |
|-------|-----------|
| Unhandled API route exceptions | Yes |
| React component crashes | Yes (via `global-error.tsx`) |
| Client-side JS errors | Yes (when DSN is set) |
| Performance traces | Yes (10% sample rate in production) |

### Manual capture in code

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  await riskyOperation();
} catch (err) {
  Sentry.captureException(err);
  throw err;
}
```

---

## Cost summary

| Plan | Price | Limits |
|------|-------|--------|
| Developer | **$0/mo** | 5k errors, 1 project |
| Team | $26/mo | Higher limits, more members |

You won't need to pay until you have meaningful traffic. Monitor usage at Sentry → **Settings** → **Subscription**.

---

## Troubleshooting

**Errors not appearing**
- Confirm `NEXT_PUBLIC_SENTRY_DSN` is set (must start with `NEXT_PUBLIC_` for client-side)
- Redeploy after adding env vars on Vercel
- Check browser ad-blockers aren't blocking Sentry ingest

**Too many errors from bots**
- Sentry → **Inbound Filters** → enable **Filter out known web crawlers**

**DSN exposed in client**
- This is normal — the DSN is public by design. Sentry uses it only for sending events, not reading data.
