import { describe, expect, it } from "vitest";
import { createWorkspace } from "@/lib/workspaces";
import { setUserPlan } from "@/lib/billing/subscription";

describe("workspace gating", () => {
  it("blocks workspace creation without team subscription", async () => {
    const userId = `ws_gate_${Date.now()}`;
    await setUserPlan(userId, "pro");

    await expect(createWorkspace(userId, "Test team")).rejects.toThrow(/Team subscription/i);
  });

  it("allows workspace creation with active team subscription", async () => {
    const userId = `ws_team_${Date.now()}`;
    await setUserPlan(userId, "team");

    const workspace = await createWorkspace(userId, "Paid team");
    expect(workspace.name).toBe("Paid team");
    expect(workspace.plan).toBe("team");
  });
});
