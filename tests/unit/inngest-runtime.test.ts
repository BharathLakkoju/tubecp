import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertKbInngestRunnerConfigured,
  isLocalKbBuildDeployment,
  kbInngestRunnerReady,
  KbBuildRunnerMisconfiguredError,
} from "@/lib/inngest/runtime";

describe("inngest runtime", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("treats localhost without INNGEST_DEV as misconfigured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.INNGEST_DEV;

    expect(isLocalKbBuildDeployment()).toBe(true);
    expect(kbInngestRunnerReady()).toBe(false);
    expect(() => assertKbInngestRunnerConfigured()).toThrow(KbBuildRunnerMisconfiguredError);
  });

  it("allows localhost when INNGEST_DEV is set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.INNGEST_DEV = "1";
    delete process.env.VERCEL;

    expect(kbInngestRunnerReady()).toBe(true);
    expect(() => assertKbInngestRunnerConfigured()).not.toThrow();
  });
});