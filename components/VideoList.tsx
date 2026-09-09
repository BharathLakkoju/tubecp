import type { RankedVideo } from "@/lib/types";
import styles from "./VideoList.module.css";

interface Props {
  videos: RankedVideo[];
}

export default function VideoList({ videos }: Props) {
  return (
    <div className={styles.videoList}>
      {videos.map((video, i) => (
        <div key={video.videoId} className={styles.videoCard}>
          <div className={styles.videoRank}>{i + 1}</div>
          <div className={styles.videoInfo}>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.videoTitle}
            >
              {video.title}
            </a>
            <div className={styles.videoMeta}>
              <span className={styles.channel}>{video.channel}</span>
              <span className={`${styles.level} ${styles[`level${video.discussionLevel}`]}`}>
                {video.discussionLevel}
              </span>
            </div>
            <p className={styles.whyRelevant}>{video.whyRelevant}</p>
          </div>
          <div className={styles.relevanceScore}>
            <span className={styles.scoreValue}>{video.relevanceScore}</span>
            <span className={styles.scoreLabel}>relevance</span>
          </div>
        </div>
      ))}
    </div>
  );
}
