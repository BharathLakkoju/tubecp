import Link from "next/link";
import styles from "./LegalPage.module.css";

interface Props {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalPage({ title, lastUpdated, children }: Props) {
  return (
    <article className={styles.page}>
      <div className={styles.inner}>
        <Link href="/" className={styles.back}>← Back to app</Link>
        <header className={styles.header}>
          <h1>{title}</h1>
          <p className={styles.updated}>Last updated: {lastUpdated}</p>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </article>
  );
}
