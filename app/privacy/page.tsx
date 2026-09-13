import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { LEGAL_LAST_UPDATED, PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy | ${PRODUCT_NAME}`,
  description: `Privacy Policy for ${PRODUCT_NAME}.`,
};

export const dynamic = "force-static";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated={LEGAL_LAST_UPDATED}>
      <p>
        This Privacy Policy explains how {PRODUCT_NAME} (&quot;we&quot;, &quot;us&quot;) collects,
        uses, and shares information when you use our website and application (the &quot;Service&quot;).
      </p>

      <h2>1. Information we collect</h2>
      <h3>Account information</h3>
      <p>
        When you sign up or sign in, we store account data in Neon PostgreSQL, including your email
        address, name, authentication identifiers, and session metadata needed to operate the
        Service. Neon privacy policy:{" "}
        <a href="https://neon.tech/privacy-policy" target="_blank" rel="noopener noreferrer">
          neon.tech/privacy-policy
        </a>
        .
      </p>

      <h3>Subscription and usage data (Neon PostgreSQL)</h3>
      <p>
        We store subscription and usage data in Neon PostgreSQL, including your plan, billing
        period and renewal dates, usage counters (research, knowledge-base builds, chat messages),
        and Polar subscription references. Neon privacy policy:{" "}
        <a href="https://neon.tech/privacy-policy" target="_blank" rel="noopener noreferrer">
          neon.tech/privacy-policy
        </a>
        .
      </p>

      <h3>Operational cache (Upstash Redis)</h3>
      <p>
        We use Upstash Redis for caching transcripts, rate-limit state, and knowledge-base
        metadata needed to provide the Service. Upstash privacy policy:{" "}
        <a href="https://upstash.com/trust/privacy.pdf" target="_blank" rel="noopener noreferrer">
          upstash.com/trust/privacy
        </a>
        .
      </p>

      <h3>Research and chat content (OpenRouter)</h3>
      <p>
        When you run research, build knowledge bases, or chat, we send prompts and related context to
        OpenRouter, which routes requests to AI model providers. This may include your research
        topics, video titles and descriptions, transcript excerpts, embeddings, and chat messages.
        OpenRouter privacy policy:{" "}
        <a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer">
          openrouter.ai/privacy
        </a>
        .
      </p>

      <h3>YouTube data (YouTube Data API)</h3>
      <p>
        To search and rank videos, we query the YouTube Data API using your research topics. We
        receive public video metadata such as titles, descriptions, channel names, thumbnails, and
        video IDs. We do not access your personal YouTube account unless you explicitly connect one
        in a future feature. Google&apos;s privacy policy applies:{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          policies.google.com/privacy
        </a>
        .
      </p>

      <h3>Payment information (Polar)</h3>
      <p>
        Paid subscriptions are processed by Polar as merchant of record. Polar collects billing
        details, payment method information, and transaction records. We receive subscription status,
        plan identifiers, and Polar customer references—not full payment card numbers. Polar privacy
        policy:{" "}
        <a href="https://polar.sh/legal/privacy" target="_blank" rel="noopener noreferrer">
          polar.sh/legal/privacy
        </a>
        .
      </p>

      <h3>Diagnostics (Sentry)</h3>
      <p>
        If configured, we use Sentry to collect error reports and performance data, which may include
        request paths, browser or device information, IP-derived location (at city level), stack
        traces, and technical logs. We configure Sentry to avoid sending unnecessary personal data.
        Sentry privacy policy:{" "}
        <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer">
          sentry.io/privacy
        </a>
        .
      </p>

      <h3>Information you provide directly</h3>
      <p>
        This includes research queries, chat messages, support emails, and feedback you choose to
        send us.
      </p>

      <h2>2. How we use information</h2>
      <ul>
        <li>Provide, operate, and secure the Service</li>
        <li>Authenticate users and enforce plan limits</li>
        <li>Process subscriptions and deliver paid features</li>
        <li>Improve reliability, performance, and product quality</li>
        <li>Respond to support requests and legal obligations</li>
        <li>Detect abuse, fraud, and violations of our Terms</li>
      </ul>

      <h2>3. Legal bases (EEA/UK users)</h2>
      <p>
        Where applicable, we process personal data based on contract performance (providing the
        Service), legitimate interests (security, analytics, improvement), consent (where required),
        and legal obligations.
      </p>

      <h2>4. How we share information</h2>
      <p>We share information with service providers that help us run the Service:</p>
      <ul>
        <li>Neon — user account storage</li>
        <li>Upstash — usage data and rate limiting</li>
        <li>OpenRouter — AI inference and embeddings</li>
        <li>Google / YouTube — video search metadata</li>
        <li>Polar — payments and subscriptions</li>
        <li>Sentry — error monitoring</li>
        <li>Vercel — hosting and infrastructure</li>
      </ul>
      <p>
        We may also disclose information if required by law, to protect rights and safety, or in
        connection with a merger, acquisition, or asset sale.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We retain account and usage data while your account is active and as needed to provide the
        Service, comply with law, resolve disputes, and enforce agreements. Knowledge-base data may
        be deleted when you remove a knowledge base, cancel a paid plan, or after a reasonable
        inactivity period. Logs and error reports are retained for a limited period consistent with
        operational needs.
      </p>

      <h2>6. Security</h2>
      <p>
        We use industry-standard measures including encrypted connections (HTTPS), access controls,
        and third-party infrastructure with security certifications. No method of transmission or
        storage is completely secure.
      </p>

      <h2>7. Your rights and choices</h2>
      <p>
        Depending on your location, you may have rights to access, correct, delete, or export your
        personal data, and to object to or restrict certain processing. You can update account
        details on your account page where available. To exercise privacy rights, contact us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. You may also lodge a complaint with
        your local data protection authority.
      </p>

      <h2>8. International transfers</h2>
      <p>
        We and our providers may process data in the United States and other countries. Where
        required, we rely on appropriate safeguards such as standard contractual clauses.
      </p>

      <h2>9. Children</h2>
      <p>
        The Service is not directed to children under 13 (or the minimum age in your jurisdiction).
        We do not knowingly collect personal data from children.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the revised version with an
        updated &quot;Last updated&quot; date. Material changes may be communicated by email or in-app
        notice where appropriate.
      </p>

      <h2>11. Contact</h2>
      <p>
        Privacy questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
