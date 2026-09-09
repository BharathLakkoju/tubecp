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
                <Link href={`/api/checkout?plan=${plan.id}`} className={styles.btnPrimary}>
                  Upgrade to {plan.name}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
