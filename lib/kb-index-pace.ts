/** Pause between KB index-video calls to reduce YouTube caption rate limits. */
export const KB_INDEX_PACE_MS = 1500;

export function kbIndexPaceDelayMs(): number {
  const jitter = Math.floor(Math.random() * 500);
  return KB_INDEX_PACE_MS + jitter;
}
