import styles from "./ProgressBar.module.css";

interface Props {
  message: string;
  progress: number;
}

export default function ProgressBar({ message, progress }: Props) {
  return (
    <div className={styles.progressBarWrap}>
      <div className={styles.progressInfo}>
        <span className={styles.progressMessage}>{message}</span>
        {progress > 0 && <span className={styles.progressPct}>{progress}%</span>}
      </div>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${Math.max(progress, 2)}%` }}
        />
      </div>
    </div>
  );
}
