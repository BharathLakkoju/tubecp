"use client";

import Link from "next/link";
import { AppSignedIn, AppSignedOut, AppSignInButton, AppUserButton } from "@/components/AuthShell";
import { useSubscription } from "@/lib/hooks/useSubscription";
import styles from "./Header.module.css";

interface Props {
  onReset?: () => void;
  showNewResearch?: boolean;
}

export default function Header({ onReset, showNewResearch }: Props) {
  const sub = useSubscription();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.logo} onClick={onReset}>
          <span className={styles.logoIcon}>▶</span>
          <Link href="/" className={styles.logoText}>YouTube Research Agent</Link>
        </div>

        <nav className={styles.nav}>
          <Link href="/pricing" className={styles.navLink}>Pricing</Link>

          <AppSignedIn>
            {!sub.loading && (
              <span className={styles.planBadge}>
                {sub.planName}
                {sub.plan === "free" && " · Research only"}
              </span>
            )}
            {showNewResearch && onReset && (
              <button className={styles.btnGhost} onClick={onReset}>New Research</button>
            )}
            <AppUserButton afterSignOutUrl="/" />
          </AppSignedIn>

          <AppSignedOut>
            <AppSignInButton mode="modal">
              <button className={styles.btnPrimary}>Sign in</button>
            </AppSignInButton>
          </AppSignedOut>
        </nav>
      </div>
    </header>
  );
}
