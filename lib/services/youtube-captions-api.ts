import { google } from "googleapis";
import { config } from "../config";
import { recordYouTubeQuotaUsage } from "../usage/api-cost";
import { incrementYouTubeQuota } from "../usage/youtube-quota";

/** captions.list costs 50 quota units. */
const CAPTIONS_LIST_QUOTA = 50;

export type CaptionTrackPresence = "present" | "absent" | "unknown";

/**
 * YouTube Data API captions.list — the official signal for whether a video
 * has caption tracks. Download still needs OAuth (owner), so this is existence
 * only. Used to tell scrape-blocked videos apart from videos with no captions.
 */
export async function youtubeCaptionTrackPresence(
  videoId: string,
  usageUserId?: string
): Promise<CaptionTrackPresence> {
  if (!config.youtubeApiKey) return "unknown";

  try {
    const youtube = google.youtube({ version: "v3", auth: config.youtubeApiKey });
    const response = await youtube.captions.list({
      part: ["snippet"],
      videoId,
    });
    await incrementYouTubeQuota(CAPTIONS_LIST_QUOTA);
    await recordYouTubeQuotaUsage(usageUserId, CAPTIONS_LIST_QUOTA);

    const items = response.data.items ?? [];
    return items.length > 0 ? "present" : "absent";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err ?? "");
    if (/not found|404|invalid video/i.test(message)) return "absent";
    console.warn(`captions.list failed for ${videoId}:`, message);
    return "unknown";
  }
}
