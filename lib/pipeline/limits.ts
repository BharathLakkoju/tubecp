import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/store/redis";
import { pipelineConfig } from "@/lib/pipeline/config";
import { getJobStore } from "@/lib/pipeline/jobs";

export class FairnessLimitError extends Error {
  code = "PIPELINE_FAIRNESS";
  constructor(message: string) {
    super(message);
    this.name = "FairnessLimitError";
  }
}

export class YoutubeTokenUnavailableError extends Error {
  constructor() {
    super("YouTube fetch token bucket is empty");
    this.name = "YoutubeTokenUnavailableError";
  }
}

export class YoutubeCircuitOpenError extends Error {
  constructor() {
    super("YouTube fetch circuit is open after a high block rate");
    this.name = "YoutubeCircuitOpenError";
  }
}

const BLOCK_WINDOW_SECONDS = 60;
const BLOCK_OPEN_THRESHOLD = 8;
const CIRCUIT_KEY = "pipeline:yt:circuit-open";
const BLOCK_KEY = "pipeline:yt:blocked";

export async function assertCanStartBuild(userId: string): Promise<void> {
  const { userMaxActiveBuilds } = pipelineConfig();
  const active = await getJobStore().countActiveRuns(userId);
  if (active >= userMaxActiveBuilds) {
    throw new FairnessLimitError(
      `You already have ${active} knowledge bases building. Wait for one to finish, then try again.`
    );
  }
}

export async function remainingFetchSlots(userId: string): Promise<number> {
  const { userMaxVideosInFlight } = pipelineConfig();
  const inFlight = await getJobStore().countInFlightVideos(userId);
  return Math.max(0, userMaxVideosInFlight - inFlight);
}

export async function takeYoutubeFetchToken(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  if (await redis.get(CIRCUIT_KEY)) {
    throw new YoutubeCircuitOpenError();
  }

  const { youtubeRequestsPerSecond, youtubeBurst } = pipelineConfig();
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(youtubeRequestsPerSecond, "1 s", youtubeBurst),
    prefix: "pipeline-yt",
  });
  const result = await limiter.limit("egress");
  if (!result.success) {
    throw new YoutubeTokenUnavailableError();
  }
}

export async function recordYoutubeBlock(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const count = await redis.incr(BLOCK_KEY);
  if (count === 1) {
    await redis.expire(BLOCK_KEY, BLOCK_WINDOW_SECONDS);
  }
  if (count >= BLOCK_OPEN_THRESHOLD) {
    await redis.set(CIRCUIT_KEY, "1", { ex: 5 * 60 });
  }
}
