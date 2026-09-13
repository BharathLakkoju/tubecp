import { afterEach, describe, expect, it } from "vitest";
import { shouldShowTeamWorkspace } from "@/lib/account/team-workspace";
import { setUserPlan } from "@/lib/billing/subscription";

describe("shouldShowTeamWorkspace", () => {
  const originalTeamPublic = process.env.NEXT_PUBLIC_TEAM_PLAN_ENABLED;

  afterEach(() => {
    process.env.NEXT_PUBLIC_TEAM_PLAN_ENABLED = originalTeamPublic;
  });

  it("hides team workspace for pro users when team tier is not public", async () => {
    delete process.env.NEXT_PUBLIC_TEAM_PLAN_ENABLED;
    const userId = `acct_pro_${Date.now()}`;
    await setUserPlan(userId, "pro");

    await expect(shouldShowTeamWorkspace(userId)).resolves.toBe(false);
  });

  it("shows team workspace for active team subscribers when tier is hidden", async () => {
    delete process.env.NEXT_PUBLIC_TEAM_PLAN_ENABLED;
    const userId = `acct_team_${Date.now()}`;
    await setUserPlan(userId, "team");

    await expect(shouldShowTeamWorkspace(userId)).resolves.toBe(true);
  });

  it("shows team workspace for all signed-in users when tier is public", async () => {
    process.env.NEXT_PUBLIC_TEAM_PLAN_ENABLED = "true";
    const userId = `acct_free_${Date.now()}`;
    await setUserPlan(userId, "free");

    await expect(shouldShowTeamWorkspace(userId)).resolves.toBe(true);
  });
});
