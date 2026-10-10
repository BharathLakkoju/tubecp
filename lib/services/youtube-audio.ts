import ytdl from "@distube/ytdl-core";

/** OpenRouter / Whisper inline upload limit is ~25 MB. */
export const STT_MAX_AUDIO_BYTES = 24 * 1024 * 1024;

export class YoutubeAudioUnavailableError extends Error {
  readonly videoId: string;

  constructor(videoId: string, cause?: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause ?? "");
    super(detail || "Could not download audio for this video");
    this.name = "YoutubeAudioUnavailableError";
    this.videoId = videoId;
  }
}

function containerToFormat(container: string | undefined): string {
  const c = (container ?? "mp4").toLowerCase();
  if (c === "webm") return "webm";
  if (c === "mp3") return "mp3";
  if (c === "m4a") return "m4a";
  return "mp4";
}

export async function fetchYoutubeAudioBuffer(
  videoId: string,
  maxBytes = STT_MAX_AUDIO_BYTES
): Promise<{ buffer: Buffer; format: string }> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: "lowestaudio", filter: "audioonly" });
    if (!format) {
      throw new YoutubeAudioUnavailableError(videoId, new Error("No audio stream available"));
    }

    const stream = ytdl.downloadFromInfo(info, { format });
    const chunks: Buffer[] = [];
    let size = 0;

    for await (const chunk of stream) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buf.length;
      if (size > maxBytes) {
        stream.destroy();
        throw new YoutubeAudioUnavailableError(
          videoId,
          new Error("Audio exceeds the speech-to-text size limit for this video")
        );
      }
      chunks.push(buf);
    }

    if (chunks.length === 0) {
      throw new YoutubeAudioUnavailableError(videoId, new Error("Downloaded audio was empty"));
    }

    return {
      buffer: Buffer.concat(chunks),
      format: containerToFormat(format.container),
    };
  } catch (err) {
    if (err instanceof YoutubeAudioUnavailableError) throw err;
    throw new YoutubeAudioUnavailableError(videoId, err);
  }
}
