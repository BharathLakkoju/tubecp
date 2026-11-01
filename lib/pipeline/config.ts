export type KbPipeline = "legacy" | "queue";

function isAdminUserId(userId: string): boolean {
  const admins = new Set(
    (process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
  return admins.size > 0 && admins.has(userId);
}

/** `KB_PIPELINE=queue` for everyone, `admin` for admin users only, anything else keeps the legacy chain. */
export function kbPipelineForUser(userId: string): KbPipeline {
  const mode = process.env.KB_PIPELINE?.trim().toLowerCase();
  if (mode === "queue") return "queue";
  if (mode === "admin" && isAdminUserId(userId)) return "queue";
  return "legacy";
}

function intEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

/** Load-test stubs must never run on Vercel or in production. */
export function pipelineLoadStubEnabled(): boolean {
  if (process.env.PIPELINE_LOAD_STUB !== "true") return false;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) return false;
  return true;
}

export function pipelineConfig() {
  return {
    region: process.env.PIPELINE_AWS_REGION?.trim() || "us-east-2",
    fetchQueueUrl: process.env.PIPELINE_FETCH_QUEUE_URL?.trim() || "",
    embedQueueUrl: process.env.PIPELINE_EMBED_QUEUE_URL?.trim() || "",
    roleArn: process.env.PIPELINE_AWS_ROLE_ARN?.trim() || "",
    /** Must match maxReceiveCount on the queues' redrive policy. */
    maxReceives: 5,
    youtubeRequestsPerSecond: intEnv("PIPELINE_YOUTUBE_RPS", 2),
    youtubeBurst: intEnv("PIPELINE_YOUTUBE_BURST", 5),
    embedTokensPerMinute: intEnv("PIPELINE_EMBED_TPM", 1_000_000),
    userMaxActiveBuilds: intEnv("PIPELINE_USER_MAX_ACTIVE_BUILDS", 2),
    userMaxVideosInFlight: intEnv("PIPELINE_USER_MAX_IN_FLIGHT", 8),
  };
}

export type PipelineConfig = ReturnType<typeof pipelineConfig>;
