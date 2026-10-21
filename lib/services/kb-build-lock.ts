import { randomUUID } from "node:crypto";
import { getDevMemoryStore } from "@/lib/store/dev-memory";
import { getRedis } from "@/lib/store/redis";

/** Kept short so a killed invocation can be resumed, and refreshed while work is running. */
const LOCK_TTL_SECONDS = 75;
const HEARTBEAT_TTL_SECONDS = 75;

type MemoryLock = { owner: string; expiresAt: number };
type MemoryHeartbeat = { at: number; expiresAt: number };

function lockKey(kbId: string): string {
  return `kb-build-lock:${kbId}`;
}

function heartbeatKey(kbId: string): string {
  return `kb-build-heartbeat:${kbId}`;
}

function memoryLock(key: string): MemoryLock | undefined {
  const value = getDevMemoryStore().get(key) as MemoryLock | undefined;
  if (!value) return undefined;
  if (value.expiresAt <= Date.now()) {
    getDevMemoryStore().delete(key);
    return undefined;
  }
  return value;
}

/** Returns an owner token when this caller holds the lock. */
export async function acquireKbBuildLock(kbId: string): Promise<string | null> {
  const owner = randomUUID();
  const key = lockKey(kbId);
  const redis = getRedis();

  if (redis) {
    const result = await redis.set(key, owner, { nx: true, ex: LOCK_TTL_SECONDS });
    return result === "OK" ? owner : null;
  }

  if (memoryLock(key)) return null;
  getDevMemoryStore().set(key, {
    owner,
    expiresAt: Date.now() + LOCK_TTL_SECONDS * 1000,
  } satisfies MemoryLock);
  return owner;
}

export async function refreshKbBuildLock(kbId: string, owner: string): Promise<boolean> {
  const key = lockKey(kbId);
  const redis = getRedis();

  if (redis) {
    const current = await redis.get<string>(key);
    if (current !== owner) return false;
    await redis.set(key, owner, { ex: LOCK_TTL_SECONDS });
    return true;
  }

  const current = memoryLock(key);
  if (!current || current.owner !== owner) return false;
  current.expiresAt = Date.now() + LOCK_TTL_SECONDS * 1000;
  return true;
}

export async function releaseKbBuildLock(kbId: string, owner: string): Promise<void> {
  const key = lockKey(kbId);
  const redis = getRedis();

  if (redis) {
    const current = await redis.get<string>(key);
    if (current === owner) await redis.del(key);
    return;
  }

  const current = memoryLock(key);
  if (current?.owner === owner) getDevMemoryStore().delete(key);
}

/** Separate from the KB record so a heartbeat cannot overwrite index progress. */
export async function writeKbBuildHeartbeat(kbId: string): Promise<void> {
  const key = heartbeatKey(kbId);
  const at = Date.now();
  const redis = getRedis();

  if (redis) {
    await redis.set(key, at, { ex: HEARTBEAT_TTL_SECONDS });
    return;
  }

  getDevMemoryStore().set(key, {
    at,
    expiresAt: at + HEARTBEAT_TTL_SECONDS * 1000,
  } satisfies MemoryHeartbeat);
}

export async function readKbBuildHeartbeat(kbId: string): Promise<number | null> {
  const key = heartbeatKey(kbId);
  const redis = getRedis();

  if (redis) {
    const at = await redis.get<number>(key);
    return typeof at === "number" && Number.isFinite(at) ? at : null;
  }

  const value = getDevMemoryStore().get(key) as MemoryHeartbeat | undefined;
  if (!value || value.expiresAt <= Date.now()) return null;
  return value.at;
}

export async function clearKbBuildHeartbeat(kbId: string): Promise<void> {
  const key = heartbeatKey(kbId);
  const redis = getRedis();
  if (redis) {
    await redis.del(key);
    return;
  }
  getDevMemoryStore().delete(key);
}
