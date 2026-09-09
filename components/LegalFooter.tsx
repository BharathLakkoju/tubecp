import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/legal";
import styles from "./LegalFooter.module.css";

export default function LegalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <nav className={styles.nav} aria-label="Legal">
        <Link href="/terms">Terms of Service</Link>
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/refund">Cancellation Policy</Link>
        <Link href="/pricing">Pricing</Link>
      </nav>
      <p className={styles.copy}>
        © {year} {PRODUCT_NAME}
      </p>
    </footer>
  );
}
