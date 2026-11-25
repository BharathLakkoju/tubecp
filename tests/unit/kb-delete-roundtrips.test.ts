import { afterEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => {
  const data = new Map<string, unknown>();
  const stats = {
    commands: 0,
    delCalls: 0,
    delKeys: 0,
    rttMs: 0,
  };

  async function wait() {
    stats.commands += 1;
    if (stats.rttMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, stats.rttMs));
    }
  }

  return {
    data,
    stats,
    reset() {
      data.clear();
      stats.commands = 0;
      stats.delCalls = 0;
      stats.delKeys = 0;
      stats.rttMs = 0;
    },
    snapshot() {
      return { commands: stats.commands, delCalls: stats.delCalls, delKeys: stats.delKeys };
    },
    wait,
  };
});

vi.mock("@/lib/store/redis", () => ({
  getRedis: () => ({
    async get(key: string) {
      await fake.wait();
      return fake.data.get(key) ?? null;
    },
    async set(key: string, value: unknown) {
      await fake.wait();
      fake.data.set(key, value);
      return "OK";
    },
    async mget(...keys: string[]) {
      await fake.wait();
      return keys.map((key) => fake.data.get(key) ?? null);
    },
    async del(...keys: string[]) {
      await fake.wait();
      fake.stats.delCalls += 1;
      fake.stats.delKeys += keys.length;
      for (const key of keys) fake.data.delete(key);
      return keys.length;
    },
  }),
  hasRedis: () => true,
  readStoredValue: (raw: unknown) => (raw == null ? null : raw),
}));

import { getRedis } from "@/lib/store/redis";
import {
  addUserKnowledgeBase,
  deleteChunksForKnowledgeBase,
  getChunksByIds,
  getKnowledgeBase,
  getUserKnowledgeBases,
  registerVideoChunks,
  saveChunk,
  saveKnowledgeBase,
} from "@/lib/store";
import {
  purgeKnowledgeBaseAssets,
  unpublishKnowledgeBase,
} from "@/lib/services/knowledge-base";
import type { KnowledgeBaseRecord, TranscriptChunk } from "@/lib/types";

const VIDEO_COUNT = 10;
const CHUNKS_PER_VIDEO = 50;
const CHUNK_COUNT = VIDEO_COUNT * CHUNKS_PER_VIDEO;

function chunkId(video: number, index: number): string {
  return `vid-${video}:emb:v1:${index}`;
}

function allChunkIds(): string[] {
  const ids: string[] = [];
  for (let video = 0; video < VIDEO_COUNT; video++) {
    for (let index = 0; index < CHUNKS_PER_VIDEO; index++) {
      ids.push(chunkId(video, index));
    }
  }
  return ids;
}

function makeKb(kbId: string, chunkIds: string[]): KnowledgeBaseRecord {
  return {
    kbId,
    topic: "Delete speed proof",
    videoIds: Array.from({ length: VIDEO_COUNT }, (_, i) => `vid-${i}`),
    chunkIds,
    chunksIndexed: chunkIds.length,
    videosIndexed: VIDEO_COUNT,
    totalMinutes: 40,
    status: "ready",
    createdAt: new Date().toISOString(),
    userId: "user-1",
  };
}

function makeChunk(id: string, videoId: string): TranscriptChunk {
  return {
    id,
    videoId,
    title: "Video",
    channel: "Channel",
    timestamp: 0,
    text: "hello",
  };
}

async function seedLibrary(kbId: string): Promise<{ kb: KnowledgeBaseRecord; chunkIds: string[] }> {
  const chunkIds = allChunkIds();
  const kb = makeKb(kbId, chunkIds);
  await saveKnowledgeBase(kb, true);
  await addUserKnowledgeBase("user-1", kb.kbId);
  for (let video = 0; video < VIDEO_COUNT; video++) {
    const videoId = `vid-${video}`;
    const ids = Array.from({ length: CHUNKS_PER_VIDEO }, (_, index) => chunkId(video, index));
    await Promise.all(ids.map((id) => saveChunk(makeChunk(id, videoId))));
    await registerVideoChunks(videoId, ids);
  }
  return { kb, chunkIds };
}

/** Master-era loop: one Redis DEL per chunk key. */
async function oldSequentialDeleteChunks(videoIds: string[], chunkIds: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("expected fake redis");
  const chunkSet = new Set(chunkIds);
  for (const videoId of videoIds) {
    const ids = (await redis.get(`video-chunks:${videoId}`)) as string[] | null;
    if (!ids) continue;
    const next = ids.filter((id) => !chunkSet.has(id));
    if (next.length === 0) {
      await redis.del(`video-chunks:${videoId}`);
    } else {
      await redis.set(`video-chunks:${videoId}`, next);
    }
  }
  for (const id of chunkIds) {
    await redis.del(`chunk:${id}`);
    await redis.del(`chunk-content:${id}`);
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

afterEach(() => {
  fake.reset();
});

describe("knowledge-base delete round-trips", () => {
  it("unpublish drops the library row without deleting chunk keys", async () => {
    const { kb, chunkIds } = await seedLibrary("kb-unpublish-proof");
    fake.stats.commands = 0;
    fake.stats.delCalls = 0;
    fake.stats.delKeys = 0;

    await unpublishKnowledgeBase(kb, "user-1");

    const afterUnpublish = fake.snapshot();
    expect(await getKnowledgeBase(kb.kbId)).toBeNull();
    expect(await getUserKnowledgeBases("user-1")).not.toContain(kb.kbId);
    expect(await getChunksByIds(chunkIds.slice(0, 3))).toHaveLength(3);
    expect(afterUnpublish.delCalls).toBeLessThan(20);
    expect([...fake.data.keys()].some((key) => key.startsWith("chunk:"))).toBe(true);

    fake.stats.commands = 0;
    fake.stats.delCalls = 0;
    fake.stats.delKeys = 0;
    await purgeKnowledgeBaseAssets(kb);

    const afterPurge = fake.snapshot();
    expect(await getChunksByIds(chunkIds.slice(0, 3))).toHaveLength(0);
    expect(afterPurge.delCalls).toBeLessThan(25);
    expect(afterPurge.delCalls).toBeLessThan(CHUNK_COUNT / 20);
    expect(afterPurge.delKeys).toBeGreaterThanOrEqual(CHUNK_COUNT * 2);

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        proof: "unpublish-then-purge",
        chunks: CHUNK_COUNT,
        unpublish: afterUnpublish,
        purge: afterPurge,
      })
    );
  });

  it("batched chunk delete uses ~100x fewer Redis DEL round-trips than master", async () => {
    const chunkIds = allChunkIds();
    const videoIds = Array.from({ length: VIDEO_COUNT }, (_, i) => `vid-${i}`);
    for (let video = 0; video < VIDEO_COUNT; video++) {
      const videoId = `vid-${video}`;
      const ids = Array.from({ length: CHUNKS_PER_VIDEO }, (_, index) => chunkId(video, index));
      await Promise.all(ids.map((id) => saveChunk(makeChunk(id, videoId))));
      await registerVideoChunks(videoId, ids);
    }

    fake.stats.delCalls = 0;
    fake.stats.delKeys = 0;
    fake.stats.commands = 0;
    await oldSequentialDeleteChunks(videoIds, chunkIds);
    const oldStats = fake.snapshot();

    for (let video = 0; video < VIDEO_COUNT; video++) {
      const videoId = `vid-${video}`;
      const ids = Array.from({ length: CHUNKS_PER_VIDEO }, (_, index) => chunkId(video, index));
      await Promise.all(ids.map((id) => saveChunk(makeChunk(id, videoId))));
      await registerVideoChunks(videoId, ids);
    }

    fake.stats.delCalls = 0;
    fake.stats.delKeys = 0;
    fake.stats.commands = 0;
    await deleteChunksForKnowledgeBase(videoIds, chunkIds);
    const newStats = fake.snapshot();

    expect(oldStats.delCalls).toBe(CHUNK_COUNT * 2 + VIDEO_COUNT);
    expect(newStats.delCalls).toBeLessThanOrEqual(Math.ceil((CHUNK_COUNT * 2) / 100) + 1);
    expect(newStats.delCalls * 50).toBeLessThan(oldStats.delCalls);
    expect(await getChunksByIds(chunkIds.slice(0, 5))).toHaveLength(0);

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        proof: "del-round-trips",
        chunks: CHUNK_COUNT,
        old: oldStats,
        batched: newStats,
        delCallRatio: Number((oldStats.delCalls / newStats.delCalls).toFixed(1)),
      })
    );
  });

  it(
    "simulated Upstash RTT: unpublish is the user-wait path, not sequential chunk DELs",
    async () => {
    const rttMs = 8;
    const timedVideos = 4;
    const timedChunksPerVideo = 15;
    const timedChunkCount = timedVideos * timedChunksPerVideo;
    const videoIds = Array.from({ length: timedVideos }, (_, i) => `tvid-${i}`);
    const chunkIds = videoIds.flatMap((videoId, video) =>
      Array.from({ length: timedChunksPerVideo }, (_, index) => `${videoId}:emb:v1:${index}`)
    );

    async function seedTimed() {
      fake.reset();
      for (let video = 0; video < timedVideos; video++) {
        const videoId = videoIds[video];
        const ids = chunkIds.slice(video * timedChunksPerVideo, (video + 1) * timedChunksPerVideo);
        await Promise.all(
          ids.map((id) =>
            saveChunk({
              id,
              videoId,
              title: "Video",
              channel: "Channel",
              timestamp: 0,
              text: "hello",
            })
          )
        );
        await registerVideoChunks(videoId, ids);
      }
    }

    const oldMs: number[] = [];
    const newMs: number[] = [];

    for (let run = 0; run < 5; run++) {
      await seedTimed();
      fake.stats.rttMs = rttMs;
      fake.stats.delCalls = 0;
      fake.stats.commands = 0;
      const oldStart = performance.now();
      await oldSequentialDeleteChunks(videoIds, chunkIds);
      oldMs.push(performance.now() - oldStart);

      await seedTimed();
      const kb = makeKb(`kb-rtt-${run}`, chunkIds);
      kb.videoIds = videoIds;
      await saveKnowledgeBase(kb, true);
      await addUserKnowledgeBase("user-1", kb.kbId);
      fake.stats.rttMs = rttMs;
      fake.stats.delCalls = 0;
      fake.stats.commands = 0;
      const newStart = performance.now();
      await unpublishKnowledgeBase(kb, "user-1");
      newMs.push(performance.now() - newStart);
      expect(await getKnowledgeBase(kb.kbId)).toBeNull();
    }

    const oldMedian = median(oldMs);
    const newMedian = median(newMs);
    expect(newMedian * 5).toBeLessThan(oldMedian);

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        proof: "simulated-upstash-rtt",
        rttMs,
        chunks: timedChunkCount,
        runs: 5,
        oldSequentialDeleteMs: {
          median: Math.round(oldMedian),
          range: [Math.round(Math.min(...oldMs)), Math.round(Math.max(...oldMs))],
        },
        unpublishMs: {
          median: Math.round(newMedian),
          range: [Math.round(Math.min(...newMs)), Math.round(Math.max(...newMs))],
        },
        limiter: `${rttMs}ms per Redis REST command; old path issues ${timedChunkCount * 2 + timedVideos} sequential DELs`,
      })
    );
    },
    30_000
  );
});
