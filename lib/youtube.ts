import type { VideoCandidate, VideoSummary } from "./types";

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function toVideoSummary(video: VideoCandidate): VideoSummary {
  return {
    videoId: video.videoId,
    title: video.title,
    channel: video.channel,
    url: video.url,
    thumbnailUrl: youtubeThumbnailUrl(video.videoId),
  };
}
