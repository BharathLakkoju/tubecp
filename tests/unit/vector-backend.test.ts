import { afterEach, describe, expect, it } from "vitest";
import {
  chatVectorBackend,
  redisVectorIndexWritesEnabled,
  resolveChatVectorBackend,
} from "@/lib/store/vector-backend";

describe("vector backend flags", () => {
  const originalBackend = process.env.CHAT_VECTOR_BACKEND;
  const originalWrites = process.env.REDIS_VECTOR_INDEX_WRITES;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.CHAT_VECTOR_BACKEND = originalBackend;
    process.env.REDIS_VECTOR_INDEX_WRITES = originalWrites;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("defaults to Upstash Vector without Redis IVF writes", () => {
    delete process.env.CHAT_VECTOR_BACKEND;
    delete process.env.REDIS_VECTOR_INDEX_WRITES;
    expect(chatVectorBackend()).toBe("upstash");
    expect(resolveChatVectorBackend()).toBe("upstash");
    expect(redisVectorIndexWritesEnabled()).toBe(false);
  });

  it("treats CHAT_VECTOR_BACKEND=redis as rollback for both read and write", () => {
    process.env.CHAT_VECTOR_BACKEND = "redis";
    expect(resolveChatVectorBackend()).toBe("redis");
    expect(redisVectorIndexWritesEnabled()).toBe(true);
  });
});
