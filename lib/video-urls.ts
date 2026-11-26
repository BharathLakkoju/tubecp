import type { VideoSummary } from "./types";

export function videoUrlsAsLines(videos: readonly Pick<VideoSummary, "url">[]): string {
  return videos.map((video) => video.url).join("\n");
}
