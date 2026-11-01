import { neon } from "@neondatabase/serverless";
import type { RankedVideo } from "@/lib/types";
import type { PipelineErrorClass } from "@/lib/pipeline/errors";

export type JobStatus =
  | "queued"
  | "fetching"
  | "fetched"
  | "embedding"
  | "indexed"
  | "skipped"
  | "failed";

export type RunStatus = "building" | "finalizing" | "ready" | "failed";

export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = ["indexed", "skipped", "failed"];

export type KbBuildRun = {
  kbId: string;
  userId: string;
  status: RunStatus;
  persistent: boolean;
  transcriptMode: "captions" | "stt";
  totalVideos: number;
  createdAt: string;
  updatedAt: string;
};

export type KbVideoJob = {
  kbId: string;
  videoId: string;
  position: number;
  title: string;
  channel: string;
  status: JobStatus;
  errorClass: PipelineErrorClass | null;
  errorMessage: string | null;
  chunkIds: string[];
  minutes: number;
};

export type JobCounts = {
  total: number;
  indexed: number;
  skipped: number;
  failed: number;
  open: number;
  processed: number;
};

export type JobStore = {
  insertRun(input: {
    kbId: string;
    userId: string;
    persistent: boolean;
    transcriptMode: "captions" | "stt";
    videos: RankedVideo[];
  }): Promise<void>;
  getRun(kbId: string): Promise<KbBuildRun | null>;
  getJob(kbId: string, videoId: string): Promise<KbVideoJob | null>;
  listJobs(kbId: string): Promise<KbVideoJob[]>;
  claimJob(kbId: string, videoId: string, from: JobStatus[], to: JobStatus): Promise<KbVideoJob | null>;
  markFetched(kbId: string, videoId: string): Promise<void>;
  markIndexed(kbId: string, videoId: string, chunkIds: string[], minutes: number): Promise<void>;
  markSkipped(kbId: string, videoId: string, errorClass: PipelineErrorClass, message: string): Promise<void>;
  markFailed(kbId: string, videoId: string, errorClass: PipelineErrorClass, message: string): Promise<void>;
  counts(kbId: string): Promise<JobCounts>;
  tryBeginFinalize(kbId: string): Promise<boolean>;
  finishRun(kbId: string, status: "ready" | "failed"): Promise<void>;
  countActiveRuns(userId: string): Promise<number>;
  countInFlightVideos(userId: string): Promise<number>;
  listQueuedJobs(userId: string, limit: number): Promise<KbVideoJob[]>;
  resetRetryableJobs(kbId: string): Promise<KbVideoJob[]>;
};

function isTerminal(status: JobStatus): boolean {
  return TERMINAL_JOB_STATUSES.includes(status);
}

function countsFrom(jobs: KbVideoJob[]): JobCounts {
  let indexed = 0;
  let skipped = 0;
  let failed = 0;
  let open = 0;
  for (const job of jobs) {
    if (job.status === "indexed") indexed += 1;
    else if (job.status === "skipped") skipped += 1;
    else if (job.status === "failed") failed += 1;
    else open += 1;
  }
  const total = jobs.length;
  return {
    total,
    indexed,
    skipped,
    failed,
    open,
    processed: total - open,
  };
}

export function createMemoryJobStore(): JobStore {
  const runs = new Map<string, KbBuildRun>();
  const jobs = new Map<string, KbVideoJob>();

  const jobKey = (kbId: string, videoId: string) => `${kbId}\0${videoId}`;

  return {
    async insertRun(input) {
      const now = new Date().toISOString();
      runs.set(input.kbId, {
        kbId: input.kbId,
        userId: input.userId,
        status: "building",
        persistent: input.persistent,
        transcriptMode: input.transcriptMode,
        totalVideos: input.videos.length,
        createdAt: now,
        updatedAt: now,
      });
      input.videos.forEach((video, position) => {
        jobs.set(jobKey(input.kbId, video.videoId), {
          kbId: input.kbId,
          videoId: video.videoId,
          position,
          title: video.title,
          channel: video.channel,
          status: "queued",
          errorClass: null,
          errorMessage: null,
          chunkIds: [],
          minutes: 0,
        });
      });
    },
    async getRun(kbId) {
      return runs.get(kbId) ?? null;
    },
    async getJob(kbId, videoId) {
      return jobs.get(jobKey(kbId, videoId)) ?? null;
    },
    async listJobs(kbId) {
      return [...jobs.values()]
        .filter((job) => job.kbId === kbId)
        .sort((a, b) => a.position - b.position);
    },
    async claimJob(kbId, videoId, from, to) {
      const job = jobs.get(jobKey(kbId, videoId));
      if (!job || !from.includes(job.status)) return null;
      const next = { ...job, status: to };
      jobs.set(jobKey(kbId, videoId), next);
      return next;
    },
    async markFetched(kbId, videoId) {
      const job = jobs.get(jobKey(kbId, videoId));
      if (!job) return;
      jobs.set(jobKey(kbId, videoId), { ...job, status: "fetched", errorClass: null, errorMessage: null });
    },
    async markIndexed(kbId, videoId, chunkIds, minutes) {
      const job = jobs.get(jobKey(kbId, videoId));
      if (!job) return;
      jobs.set(jobKey(kbId, videoId), {
        ...job,
        status: "indexed",
        chunkIds,
        minutes,
        errorClass: null,
        errorMessage: null,
      });
    },
    async markSkipped(kbId, videoId, errorClass, message) {
      const job = jobs.get(jobKey(kbId, videoId));
      if (!job) return;
      jobs.set(jobKey(kbId, videoId), {
        ...job,
        status: "skipped",
        errorClass,
        errorMessage: message,
      });
    },
    async markFailed(kbId, videoId, errorClass, message) {
      const job = jobs.get(jobKey(kbId, videoId));
      if (!job) return;
      jobs.set(jobKey(kbId, videoId), {
        ...job,
        status: "failed",
        errorClass,
        errorMessage: message,
      });
    },
    async counts(kbId) {
      return countsFrom(await this.listJobs(kbId));
    },
    async tryBeginFinalize(kbId) {
      const run = runs.get(kbId);
      if (!run || run.status !== "building") return false;
      const open = (await this.listJobs(kbId)).some((job) => !isTerminal(job.status));
      if (open) return false;
      runs.set(kbId, { ...run, status: "finalizing", updatedAt: new Date().toISOString() });
      return true;
    },
    async finishRun(kbId, status) {
      const run = runs.get(kbId);
      if (!run) return;
      runs.set(kbId, { ...run, status, updatedAt: new Date().toISOString() });
    },
    async countActiveRuns(userId) {
      return [...runs.values()].filter(
        (run) => run.userId === userId && (run.status === "building" || run.status === "finalizing")
      ).length;
    },
    async countInFlightVideos(userId) {
      const active = new Set(
        [...runs.values()]
          .filter((run) => run.userId === userId && (run.status === "building" || run.status === "finalizing"))
          .map((run) => run.kbId)
      );
      return [...jobs.values()].filter((job) => active.has(job.kbId) && !isTerminal(job.status) && job.status !== "queued")
        .length;
    },
    async listQueuedJobs(userId, limit) {
      const active = new Set(
        [...runs.values()]
          .filter((run) => run.userId === userId && run.status === "building")
          .map((run) => run.kbId)
      );
      return [...jobs.values()]
        .filter((job) => active.has(job.kbId) && job.status === "queued")
        .sort((a, b) => a.position - b.position)
        .slice(0, limit);
    },
    async resetRetryableJobs(kbId) {
      const reset: KbVideoJob[] = [];
      for (const job of await this.listJobs(kbId)) {
        if (job.status === "indexed") continue;
        const next = {
          ...job,
          status: "queued" as const,
          errorClass: null,
          errorMessage: null,
        };
        jobs.set(jobKey(kbId, job.videoId), next);
        reset.push(next);
      }
      const run = runs.get(kbId);
      if (run) {
        runs.set(kbId, { ...run, status: "building", updatedAt: new Date().toISOString() });
      }
      return reset;
    },
  };
}

function neonSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(url);
}

function mapRun(row: Record<string, unknown>): KbBuildRun {
  return {
    kbId: String(row.kb_id),
    userId: String(row.user_id),
    status: row.status as RunStatus,
    persistent: Boolean(row.persistent),
    transcriptMode: row.transcript_mode === "stt" ? "stt" : "captions",
    totalVideos: Number(row.total_videos),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapJob(row: Record<string, unknown>): KbVideoJob {
  return {
    kbId: String(row.kb_id),
    videoId: String(row.video_id),
    position: Number(row.position),
    title: String(row.title),
    channel: String(row.channel ?? ""),
    status: row.status as JobStatus,
    errorClass: (row.error_class as PipelineErrorClass | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    chunkIds: Array.isArray(row.chunk_ids) ? (row.chunk_ids as string[]) : [],
    minutes: Number(row.minutes ?? 0),
  };
}

export function createNeonJobStore(): JobStore {
  return {
    async insertRun(input) {
      const sql = neonSql();
      await sql.query(
        `INSERT INTO kb_build_runs (kb_id, user_id, status, persistent, transcript_mode, total_videos)
         VALUES ($1, $2, 'building', $3, $4, $5)
         ON CONFLICT (kb_id) DO UPDATE SET
           status = 'building',
           persistent = EXCLUDED.persistent,
           transcript_mode = EXCLUDED.transcript_mode,
           total_videos = EXCLUDED.total_videos,
           updated_at = NOW(),
           finished_at = NULL,
           finalize_started_at = NULL`,
        [input.kbId, input.userId, input.persistent, input.transcriptMode, input.videos.length]
      );
      if (input.videos.length === 0) return;
      const values: unknown[] = [];
      const placeholders = input.videos.map((video, i) => {
        const base = i * 5;
        values.push(input.kbId, video.videoId, i, video.title, video.channel);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, 'queued')`;
      });
      await sql.query(
        `INSERT INTO kb_video_jobs (kb_id, video_id, position, title, channel, status)
         VALUES ${placeholders.join(", ")}
         ON CONFLICT (kb_id, video_id) DO UPDATE SET
           position = EXCLUDED.position,
           title = EXCLUDED.title,
           channel = EXCLUDED.channel,
           status = 'queued',
           error_class = NULL,
           error_message = NULL,
           chunk_ids = '{}',
           minutes = 0,
           updated_at = NOW()`,
        values
      );
    },
    async getRun(kbId) {
      const rows = (await neonSql().query(`SELECT * FROM kb_build_runs WHERE kb_id = $1`, [kbId])) as Record<
        string,
        unknown
      >[];
      return rows[0] ? mapRun(rows[0]) : null;
    },
    async getJob(kbId, videoId) {
      const rows = (await neonSql().query(
        `SELECT * FROM kb_video_jobs WHERE kb_id = $1 AND video_id = $2`,
        [kbId, videoId]
      )) as Record<string, unknown>[];
      return rows[0] ? mapJob(rows[0]) : null;
    },
    async listJobs(kbId) {
      const rows = (await neonSql().query(
        `SELECT * FROM kb_video_jobs WHERE kb_id = $1 ORDER BY position`,
        [kbId]
      )) as Record<string, unknown>[];
      return rows.map(mapJob);
    },
    async claimJob(kbId, videoId, from, to) {
      const rows = (await neonSql().query(
        `UPDATE kb_video_jobs
         SET status = $3, updated_at = NOW()
         WHERE kb_id = $1 AND video_id = $2 AND status = ANY($4::text[])
         RETURNING *`,
        [kbId, videoId, to, from]
      )) as Record<string, unknown>[];
      return rows[0] ? mapJob(rows[0]) : null;
    },
    async markFetched(kbId, videoId) {
      await neonSql().query(
        `UPDATE kb_video_jobs
         SET status = 'fetched', error_class = NULL, error_message = NULL, updated_at = NOW()
         WHERE kb_id = $1 AND video_id = $2`,
        [kbId, videoId]
      );
    },
    async markIndexed(kbId, videoId, chunkIds, minutes) {
      await neonSql().query(
        `UPDATE kb_video_jobs
         SET status = 'indexed', chunk_ids = $3::text[], minutes = $4,
             error_class = NULL, error_message = NULL, updated_at = NOW()
         WHERE kb_id = $1 AND video_id = $2`,
        [kbId, videoId, chunkIds, minutes]
      );
    },
    async markSkipped(kbId, videoId, errorClass, message) {
      await neonSql().query(
        `UPDATE kb_video_jobs
         SET status = 'skipped', error_class = $3, error_message = $4, updated_at = NOW()
         WHERE kb_id = $1 AND video_id = $2`,
        [kbId, videoId, errorClass, message]
      );
    },
    async markFailed(kbId, videoId, errorClass, message) {
      await neonSql().query(
        `UPDATE kb_video_jobs
         SET status = 'failed', error_class = $3, error_message = $4, updated_at = NOW()
         WHERE kb_id = $1 AND video_id = $2`,
        [kbId, videoId, errorClass, message]
      );
    },
    async counts(kbId) {
      const rows = (await neonSql().query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'indexed')::int AS indexed,
           COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           COUNT(*) FILTER (WHERE status NOT IN ('indexed', 'skipped', 'failed'))::int AS open
         FROM kb_video_jobs WHERE kb_id = $1`,
        [kbId]
      )) as Record<string, unknown>[];
      const row = rows[0] ?? {};
      const total = Number(row.total ?? 0);
      const open = Number(row.open ?? 0);
      return {
        total,
        indexed: Number(row.indexed ?? 0),
        skipped: Number(row.skipped ?? 0),
        failed: Number(row.failed ?? 0),
        open,
        processed: total - open,
      };
    },
    async tryBeginFinalize(kbId) {
      const rows = (await neonSql().query(
        `UPDATE kb_build_runs
         SET status = 'finalizing', finalize_started_at = NOW(), updated_at = NOW()
         WHERE kb_id = $1
           AND status = 'building'
           AND NOT EXISTS (
             SELECT 1 FROM kb_video_jobs
             WHERE kb_id = $1 AND status NOT IN ('indexed', 'skipped', 'failed')
           )
         RETURNING kb_id`,
        [kbId]
      )) as Record<string, unknown>[];
      return rows.length > 0;
    },
    async finishRun(kbId, status) {
      await neonSql().query(
        `UPDATE kb_build_runs
         SET status = $2, finished_at = NOW(), updated_at = NOW()
         WHERE kb_id = $1 AND status IN ('finalizing', 'building')`,
        [kbId, status]
      );
    },
    async countActiveRuns(userId) {
      const rows = (await neonSql().query(
        `SELECT COUNT(*)::int AS n FROM kb_build_runs
         WHERE user_id = $1 AND status IN ('building', 'finalizing')`,
        [userId]
      )) as Record<string, unknown>[];
      return Number(rows[0]?.n ?? 0);
    },
    async countInFlightVideos(userId) {
      const rows = (await neonSql().query(
        `SELECT COUNT(*)::int AS n
         FROM kb_video_jobs j
         JOIN kb_build_runs r ON r.kb_id = j.kb_id
         WHERE r.user_id = $1
           AND r.status IN ('building', 'finalizing')
           AND j.status NOT IN ('queued', 'indexed', 'skipped', 'failed')`,
        [userId]
      )) as Record<string, unknown>[];
      return Number(rows[0]?.n ?? 0);
    },
    async listQueuedJobs(userId, limit) {
      const rows = (await neonSql().query(
        `SELECT j.*
         FROM kb_video_jobs j
         JOIN kb_build_runs r ON r.kb_id = j.kb_id
         WHERE r.user_id = $1 AND r.status = 'building' AND j.status = 'queued'
         ORDER BY r.created_at, j.position
         LIMIT $2`,
        [userId, limit]
      )) as Record<string, unknown>[];
      return rows.map(mapJob);
    },
    async resetRetryableJobs(kbId) {
      await neonSql().query(
        `UPDATE kb_build_runs
         SET status = 'building', finished_at = NULL, finalize_started_at = NULL, updated_at = NOW()
         WHERE kb_id = $1`,
        [kbId]
      );
      const rows = (await neonSql().query(
        `UPDATE kb_video_jobs
         SET status = 'queued', error_class = NULL, error_message = NULL, updated_at = NOW()
         WHERE kb_id = $1 AND status <> 'indexed'
         RETURNING *`,
        [kbId]
      )) as Record<string, unknown>[];
      return rows.map(mapJob);
    },
  };
}

let memoryStore: JobStore | null = null;
let neonStore: JobStore | null = null;

export function getJobStore(): JobStore {
  if (process.env.PIPELINE_JOB_STORE === "memory" || !process.env.DATABASE_URL?.trim()) {
    memoryStore ??= createMemoryJobStore();
    return memoryStore;
  }
  neonStore ??= createNeonJobStore();
  return neonStore;
}

export function resetMemoryJobStore(): void {
  memoryStore = createMemoryJobStore();
}

export async function tryGetRun(kbId: string) {
  try {
    return await getJobStore().getRun(kbId);
  } catch (err) {
    console.warn(`Pipeline job store unavailable for ${kbId}:`, err);
    return null;
  }
}
