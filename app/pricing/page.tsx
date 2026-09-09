import Link from "next/link";
import { PLANS } from "@/lib/plans";
import styles from "./page.module.css";

export default function PricingPage() {
  const plans = [PLANS.free, PLANS.pro, PLANS.researcher];

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link href="/" className={styles.back}>← Back to app</Link>
        <h1 className={styles.title}>Simple, credit-based pricing</h1>
        <p className={styles.sub}>
          Free tier gets ranked video lists. Paid plans unlock knowledge base builds and chat.
        </p>

        <div className={styles.grid}>
          {plans.map((plan) => (
            <div key={plan.id} className={`${styles.card} ${plan.id === "pro" ? styles.featured : ""}`}>
              {plan.id === "pro" && <span className={styles.badge}>Most popular</span>}
              <h2>{plan.name}</h2>
              <p className={styles.price}>
                ${plan.priceMonthly}
                <span>/mo</span>
              </p>
              <ul>
                <li>{plan.researchPerDay} researches / day</li>
                <li>{plan.kbBuildsPerMonth} KB builds / month</li>
                <li>{plan.chatMessagesPerMonth} chat messages / month</li>
                <li>{plan.persistentKbs ? "Persistent knowledge bases" : "Ranked lists only"}</li>
              </ul>
              {plan.id === "free" ? (
                <Link href="/" className={styles.btnSecondary}>Get started free</Link>
              ) : (
                <>
                  <Link href={`/api/checkout?plan=${plan.id}`} className={styles.btnPrimary}>
                    Upgrade to {plan.name}
                  </Link>
                  <p className={styles.checkoutLegal}>
                    By upgrading, you agree to our{" "}
                    <Link href="/terms">Terms of Service</Link> and{" "}
                    <Link href="/refund">Cancellation Policy</Link>. Payments are processed by{" "}
                    <a href="https://polar.sh" target="_blank" rel="noopener noreferrer">
                      Polar
                    </a>{" "}
                    as merchant of record.
                  </p>
                </>
              )}
            </div>
          ))}
        </div>

        <p className={styles.pageLegal}>
          Paid plans renew monthly. Cancel anytime—cancellation takes effect at the end of your
          billing period. All fees are non-refundable. See our{" "}
          <Link href="/refund">Cancellation Policy</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
