import { describe, expect, it } from "vitest";
import { canBuildKb, canChat, getPlan, PLANS } from "@/lib/plans";

describe("plans", () => {
  it("returns free plan by default", () => {
    expect(getPlan(undefined).id).toBe("free");
    expect(getPlan("unknown").id).toBe("free");
  });

  it("returns pro and researcher plans", () => {
    expect(getPlan("pro").kbBuildsPerMonth).toBe(10);
    expect(getPlan("researcher").chatMessagesPerMonth).toBe(600);
  });

  it("free tier cannot build KB or chat", () => {
    expect(canBuildKb(PLANS.free)).toBe(false);
    expect(canChat(PLANS.free)).toBe(false);
  });

  it("paid tiers can build KB and chat", () => {
    expect(canBuildKb(PLANS.pro)).toBe(true);
    expect(canChat(PLANS.pro)).toBe(true);
    expect(canBuildKb(PLANS.researcher)).toBe(true);
  });
});
