import { describe, expect, it } from "vitest";
import {
  assertResearchSession,
  createResearchSession,
  ResearchSessionError,
} from "@/lib/research-session";

describe("research session", () => {
  it("creates and validates a session for the same user", async () => {
    const sessionId = await createResearchSession("user-1");
    await expect(assertResearchSession("user-1", sessionId)).resolves.toBeUndefined();
  });

  it("rejects missing session id", async () => {
    await expect(assertResearchSession("user-1", undefined)).rejects.toBeInstanceOf(
      ResearchSessionError
    );
  });

  it("rejects another user's session", async () => {
    const sessionId = await createResearchSession("user-1");
    await expect(assertResearchSession("user-2", sessionId)).rejects.toBeInstanceOf(
      ResearchSessionError
    );
  });
});
