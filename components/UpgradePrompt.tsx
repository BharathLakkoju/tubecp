"use client";

import Link from "next/link";
import styles from "./UpgradePrompt.module.css";

interface Props {
  title: string;
  description: string;
  plan?: "pro" | "researcher";
}

export default function UpgradePrompt({ title, description, plan = "pro" }: Props) {
  return (
    <div className={styles.prompt}>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className={styles.actions}>
        <Link href={`/api/checkout?plan=${plan}`} className={styles.upgradeBtn}>
          Upgrade to {plan === "researcher" ? "Researcher" : "Pro"}
        </Link>
        <Link href="/pricing" className={styles.link}>Compare plans</Link>
      </div>
    </div>
  );
}
