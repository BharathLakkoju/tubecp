import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { LEGAL_LAST_UPDATED, PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Terms of Service | ${PRODUCT_NAME}`,
  description: `Terms of Service for ${PRODUCT_NAME}.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated={LEGAL_LAST_UPDATED}>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of{" "}
        {PRODUCT_NAME} (the &quot;Service&quot;). By creating an account, using the Service, or
        purchasing a paid plan, you agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        {PRODUCT_NAME} helps you search YouTube by topic, rank relevant videos, build knowledge
        bases from video transcripts, and chat with those knowledge bases using cited sources.
        Features and usage limits depend on your subscription plan.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must create an account through our authentication provider, Clerk, to use most features.
        You are responsible for maintaining the confidentiality of your account and for all activity
        under it. You must provide accurate information and notify us promptly of unauthorized use.
      </p>

      <h2>3. Subscriptions and billing</h2>
      <p>
        Paid plans are billed monthly on a recurring basis. Checkout and payment processing are
        handled by Polar, which acts as merchant of record for your purchase. By subscribing, you
        authorize recurring charges until you cancel. Prices, plan limits, and features are described
        on our <a href="/pricing">pricing page</a> and may change with reasonable notice.
      </p>
      <p>
        All subscription fees are non-refundable. Cancellations are governed by our{" "}
        <a href="/refund">Cancellation Policy</a> and take effect at the end of your current billing
        period.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for unlawful, harmful, or abusive purposes</li>
        <li>Attempt to bypass usage limits, authentication, or security controls</li>
        <li>Reverse engineer, scrape, or overload the Service in ways that impair others</li>
        <li>Submit content that infringes intellectual property or privacy rights</li>
        <li>Resell or redistribute the Service without permission</li>
      </ul>
      <p>
        YouTube content accessed through the Service remains subject to YouTube&apos;s terms and the
        rights of respective creators. You are responsible for how you use research outputs.
      </p>

      <h2>5. AI-generated output</h2>
      <p>
        Rankings, summaries, and chat responses are generated using third-party AI models and may be
        incomplete or inaccurate. The Service is provided for research assistance only and does not
        constitute professional, legal, financial, or other advice. Verify important information
        independently.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        We retain all rights in the Service, including software, branding, and documentation. You
        retain rights in content you submit (such as research topics and chat prompts). You grant us
        a limited license to process that content solely to operate and improve the Service.
      </p>

      <h2>7. Third-party services</h2>
      <p>
        The Service integrates with third parties including Clerk (auth), Polar (payments), Upstash
        (data storage), OpenRouter (AI), the YouTube Data API, and Sentry (monitoring). Your use of
        those services may also be subject to their terms. See our{" "}
        <a href="/privacy">Privacy Policy</a> for how data is shared.
      </p>

      <h2>8. Availability and changes</h2>
      <p>
        We may modify, suspend, or discontinue features at any time. We strive for reliability but
        do not guarantee uninterrupted access. Beta or experimental features may change or be
        removed without notice.
      </p>

      <h2>9. Disclaimer of warranties</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
        ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE, AND NON-INFRINGEMENT.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR SUPPLIERS WILL NOT BE LIABLE FOR ANY
        INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
        DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM
        RELATING TO THE SERVICE IS LIMITED TO THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS
        BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR ONE HUNDRED U.S. DOLLARS ($100), WHICHEVER IS
        GREATER.
      </p>

      <h2>11. Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate access if you violate
        these Terms or if necessary to protect the Service or other users. Upon termination, your
        right to use the Service ends, but sections that by nature should survive will remain in
        effect.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, United States, without regard
        to conflict-of-law principles, except where mandatory consumer protection laws in your
        jurisdiction provide otherwise.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these Terms: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
