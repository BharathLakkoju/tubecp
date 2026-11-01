import { afterEach, describe, expect, it } from "vitest";
import { kbPipelineForUser } from "@/lib/pipeline/config";

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

  it("enables the queue for admins only when KB_PIPELINE=admin", () => {
    process.env.KB_PIPELINE = "admin";
    process.env.ADMIN_USER_IDS = "1,2";
    expect(kbPipelineForUser("1")).toBe("queue");
    expect(kbPipelineForUser("9")).toBe("legacy");
  });
});
