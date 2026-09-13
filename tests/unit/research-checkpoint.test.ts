import { describe, expect, it } from "vitest";
import {
  createResearchSession,
  getResearchCheckpoint,
  saveResearchCheckpoint,
} from "@/lib/research-session";

describe("research checkpoints", () => {
  it("saves and loads checkpoint for a session", async () => {
    const userId = "user_checkpoint_test";
    const sessionId = await createResearchSession(userId);

    await saveResearchCheckpoint(sessionId, {
      topic: "TypeScript generics",
      stage: "searched",
      queries: ["typescript generics patterns"],
      videosSearched: 12,
      updatedAt: new Date().toISOString(),
    });

    const checkpoint = await getResearchCheckpoint(userId, sessionId);
    expect(checkpoint?.stage).toBe("searched");
    expect(checkpoint?.topic).toBe("TypeScript generics");
    expect(checkpoint?.queries).toEqual(["typescript generics patterns"]);
  });
});
