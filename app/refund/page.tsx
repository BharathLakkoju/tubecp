import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { LEGAL_LAST_UPDATED, PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Cancellation Policy | ${PRODUCT_NAME}`,
  description: `Subscription cancellation policy for ${PRODUCT_NAME} paid plans.`,
};

export const dynamic = "force-static";

export default function CancellationPage() {
  return (
    <LegalPage title="Cancellation Policy" lastUpdated={LEGAL_LAST_UPDATED}>
      <p>
        This policy describes how subscriptions and cancellations work for paid plans on{" "}
        {PRODUCT_NAME}. All subscription fees are non-refundable.
      </p>

      <h2>1. Merchant of record</h2>
      <p>
        Payments for {PRODUCT_NAME} subscriptions are processed by{" "}
        <a href="https://polar.sh" target="_blank" rel="noopener noreferrer">Polar</a>, which acts
        as merchant of record. Your receipt and billing communications may come from Polar. Polar&apos;s
        terms and buyer policies also apply to your purchase.
      </p>

      <h2>2. Subscription billing</h2>
      <p>
        Pro and Researcher plans are billed monthly in advance on a recurring basis until canceled.
        When you subscribe, you are charged for the full current billing period. Plan limits reset
        according to the billing period shown in your account or receipt. Current prices are listed
        on our <a href="/pricing">pricing page</a>.
      </p>

      <h2>3. No refunds</h2>
      <p>
        All payments are final. We do not offer refunds, credits, or prorated adjustments for partial
        billing periods, unused time, or unused monthly allowances (research runs, knowledge-base
        builds, or chat messages)—including if you cancel before the end of your billing period.
      </p>
      <p>
        This applies to initial purchases, renewals, and plan upgrades. By subscribing, you acknowledge
        that you will not receive a refund if you stop using the Service or cancel mid-cycle.
      </p>

      <h2>4. How to cancel</h2>
      <p>
        You may cancel your subscription at any time. Cancellation stops future renewals; it does not
        delete your account.
      </p>
      <ul>
        <li>
          Use the billing or subscription management link provided in your Polar checkout receipt or
          confirmation email
        </li>
        <li>
          Or contact us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the email
          address associated with your account and we will help process cancellation
        </li>
      </ul>
      <p>
        <strong>Cancellation takes effect at the end of your current billing period.</strong> You will
        keep access to paid features until that date, and your account will move to the Free plan
        limits when the period ends. You will not be charged again unless you resubscribe.
      </p>

      <h2>5. Plan changes</h2>
      <p>
        Upgrades and downgrades take effect according to Polar&apos;s billing flow. If you change
        plans mid-cycle, any price difference is not refunded. When downgrading, your lower plan
        limits apply at the start of the next billing period unless otherwise stated at checkout.
      </p>

      <h2>6. Billing errors</h2>
      <p>
        If you believe you were charged in error—for example, a renewal after you already
        canceled—contact us within 7 days at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your account email and Polar
        receipt. We will review the charge with Polar and correct confirmed billing mistakes.
      </p>

      <h2>7. Contact</h2>
      <p>
        Billing and cancellation questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
      <p>
        Please include the email on your account and, if available, your Polar receipt or order
        reference to help us respond faster.
      </p>
    </LegalPage>
  );
}
