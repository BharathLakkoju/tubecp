# Resend setup guide

TubeCP uses [Resend](https://resend.com) to send transactional email for **credentials sign-up** and **password reset**. OAuth sign-in (Google/GitHub) does not use Resend.

Emails are sent from `lib/email.ts` via the Resend HTTP API — no extra npm package required.

---

## What Resend powers in this app

| Flow | Trigger | Email |
|------|---------|-------|
| Email verification | User signs up with email + password | “Verify your Tubecp email” |
| Resend verification | User clicks “Resend verification” on sign-in | Same verification email |
| Password reset | User submits `/forgot-password` | “Reset your Tubecp password” |

If Resend is not configured:

- **Local dev** (`NODE_ENV=development`): links are logged to the server console instead of sent.
- **Production**: register, forgot-password, and resend-verification return **503** and registration rolls back.

---

## Step 1: Create a Resend account

1. Go to [https://resend.com/signup](https://resend.com/signup)
2. Create an account and open the [Resend dashboard](https://resend.com/emails)
3. Resend’s free tier is enough for early production (3,000 emails/month on the free plan — check [Resend pricing](https://resend.com/pricing) for current limits)

---

## Step 2: Create an API key

1. Resend dashboard → **API Keys** → **Create API Key**
2. Name it (e.g. `tubecp-production` or `tubecp-local`)
3. Permission: **Sending access** (full access is fine for a single-app key)
4. Copy the key — it starts with `re_`

You will only paste this into environment variables, never into git.

---

## Step 3: Configure the sender address (`EMAIL_FROM`)

Resend requires the **From** address to use a domain you have verified (or Resend’s shared sandbox domain for testing).

### Option A — Quick local testing (no custom domain)

Use Resend’s sandbox sender. You can only deliver to **your own Resend account email** until a domain is verified.

```bash
EMAIL_FROM=Tubecp <onboarding@resend.dev>
```

This is the default in `.env.example`.

### Option B — Production (recommended)

1. Resend dashboard → **Domains** → **Add Domain**
2. Enter your domain (e.g. `your-domain.com`)
3. Add the DNS records Resend shows (SPF, DKIM; optionally DMARC)
4. Wait until the domain status is **Verified**
5. Set a From address on that domain:

```bash
EMAIL_FROM=Tubecp <noreply@your-domain.com>
```

Format: `Display Name <email@domain.com>` or plain `email@domain.com`.

Use the same address (or subdomain) you list on legal/support pages (`NEXT_PUBLIC_SUPPORT_EMAIL`).

---

## Step 4: Add environment variables

### Local development

In `.env.local`:

```bash
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=Tubecp <onboarding@resend.dev>

# Required so verification/reset links point to your app
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
```

Restart `npm run dev` after changing env vars.

**Without `RESEND_API_KEY` in local dev:** the app still works. Check the terminal when you sign up or reset a password — you’ll see lines like:

```text
[email-verify] user@example.com → http://localhost:3000/verify-email?token=...
```

Copy that URL into the browser to complete the flow.

### Vercel production

1. Vercel → your project → **Settings** → **Environment Variables**
2. Add for **Production** (and Preview if you test email there):

| Name | Value |
|------|--------|
| `RESEND_API_KEY` | `re_...` from Step 2 |
| `EMAIL_FROM` | `Tubecp <noreply@your-domain.com>` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

3. **Redeploy** so the new variables load.

`AUTH_URL` is optional if `NEXT_PUBLIC_APP_URL` is set — both are used to build links in verification and reset emails.

---

## Step 5: Verify the connection

### Health check

```bash
curl https://your-app.vercel.app/api/health
```

In production, `status` should be `"ok"` when email is configured. Check:

```json
{
  "checks": {
    "resendKey": true,
    "emailFrom": true
  }
}
```

Or run the deploy validator locally with production env loaded:

```bash
NODE_ENV=production npm run validate:deploy
```

### Manual test — sign-up verification

1. Open `/sign-up`
2. Register with email + password
3. Check inbox (and Resend dashboard → **Emails** for delivery logs)
4. Click the link → `/verify-email?token=...`
5. Sign in at `/sign-in`

### Manual test — password reset

1. Open `/forgot-password`
2. Submit the same email
3. Open the reset link → `/reset-password?token=...`
4. Set a new password and sign in

### Resend dashboard

**Emails** shows send status, bounces, and API errors. Use this first when something fails in production.

---

## Environment reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | Production | Bearer token for `https://api.resend.com/emails` |
| `EMAIL_FROM` | Production | Sender shown to users; must match a verified domain (or `onboarding@resend.dev` for sandbox) |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL for links in emails |
| `AUTH_URL` | Optional | Fallback base URL if `NEXT_PUBLIC_APP_URL` is unset |

See also `.env.example` and [OPS-DEPLOY.md](./OPS-DEPLOY.md).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `503` on sign-up / forgot-password in production | Missing `RESEND_API_KEY` or `EMAIL_FROM` | Set both in Vercel and redeploy |
| `validate:deploy` fails on Resend | Env not loaded | Export vars or use `.env.local` with `NODE_ENV=production` |
| Email not received (sandbox) | `onboarding@resend.dev` only sends to your Resend account email | Verify a custom domain or test with the account owner’s inbox |
| “Domain not verified” in Resend logs | DNS not propagated | Re-check SPF/DKIM in Resend → Domains |
| Links go to wrong host | `NEXT_PUBLIC_APP_URL` wrong | Set to exact public URL (no trailing slash issues — app normalizes via `getAppUrl()`) |
| OAuth works but email sign-up fails | Expected — OAuth doesn’t use Resend | Configure Resend only for email/password users |
| Local dev: no email, no console line | Not in development mode | Ensure `NODE_ENV=development` and restart dev server |

---

## Security notes

- Never commit `RESEND_API_KEY` to git (`.env.local` is gitignored).
- Rotate the API key in Resend if it is exposed.
- Use a dedicated subdomain for mail (e.g. `mail.your-domain.com`) if your DNS provider recommends it.
- Password reset and verification tokens expire (1 hour / 24 hours) and are stored in Postgres (`verification_token`).

---

## Related code

| File | Role |
|------|------|
| `lib/email.ts` | Sends mail via Resend API |
| `lib/email-verification.ts` | Verification tokens + `/verify-email` links |
| `lib/password-reset.ts` | Reset tokens + `/reset-password` links |
| `app/api/auth/register/route.ts` | Sends verification on sign-up |
| `app/api/auth/resend-verification/route.ts` | Resends verification |
| `app/api/auth/forgot-password/route.ts` | Sends reset email |
