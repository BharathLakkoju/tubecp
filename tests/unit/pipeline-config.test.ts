import { afterEach, describe, expect, it } from "vitest";
import { kbPipelineForUser, pipelineLoadStubEnabled } from "@/lib/pipeline/config";

describe("kbPipelineForUser", () => {
  const originalPipeline = process.env.KB_PIPELINE;
  const originalAdmins = process.env.ADMIN_USER_IDS;

  afterEach(() => {
    process.env.KB_PIPELINE = originalPipeline;
    process.env.ADMIN_USER_IDS = originalAdmins;
  });

  it("keeps the legacy chain by default", () => {
    delete process.env.KB_PIPELINE;
    expect(kbPipelineForUser("1")).toBe("legacy");
  });

  it("enables the queue for everyone when KB_PIPELINE=queue", () => {
    process.env.KB_PIPELINE = "queue";
    expect(kbPipelineForUser("99")).toBe("queue");
  });

  it("ignores PIPELINE_LOAD_STUB on Vercel and in production", () => {
    const previousStub = process.env.PIPELINE_LOAD_STUB;
    const previousVercel = process.env.VERCEL;
    const previousNode = process.env.NODE_ENV;
    try {
      process.env.PIPELINE_LOAD_STUB = "true";
      delete process.env.VERCEL;
      process.env.NODE_ENV = "test";
      expect(pipelineLoadStubEnabled()).toBe(true);
      process.env.VERCEL = "1";
      expect(pipelineLoadStubEnabled()).toBe(false);
      delete process.env.VERCEL;
      process.env.NODE_ENV = "production";
      expect(pipelineLoadStubEnabled()).toBe(false);
    } finally {
      if (previousStub === undefined) delete process.env.PIPELINE_LOAD_STUB;
      else process.env.PIPELINE_LOAD_STUB = previousStub;
      if (previousVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previousVercel;
      process.env.NODE_ENV = previousNode;
    }
  });

  it("enables the queue for admins only when KB_PIPELINE=admin", () => {
    process.env.KB_PIPELINE = "admin";
    process.env.ADMIN_USER_IDS = "1,2";
    expect(kbPipelineForUser("1")).toBe("queue");
    expect(kbPipelineForUser("9")).toBe("legacy");
  });
});
