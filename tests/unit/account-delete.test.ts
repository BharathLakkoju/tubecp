import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteUserAccount } from "@/lib/account";
import { PolarSubscriptionError } from "@/lib/billing/polar-subscription";

const revokePolarSubscription = vi.fn();
const getUserSubscription = vi.fn();
const listUserKnowledgeBaseRecords = vi.fn();
const deleteKnowledgeBase = vi.fn();
const poolQuery = vi.fn();

vi.mock("@/lib/billing/polar-subscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/polar-subscription")>();
  return {
    ...actual,
    revokePolarSubscription: (...args: unknown[]) => revokePolarSubscription(...args),
  };
});

vi.mock("@/lib/billing/subscription", () => ({
  getUserSubscription: (...args: unknown[]) => getUserSubscription(...args),
}));

vi.mock("@/lib/store", () => ({
  listUserKnowledgeBaseRecords: (...args: unknown[]) => listUserKnowledgeBaseRecords(...args),
}));

vi.mock("@/lib/services/knowledge-base", () => ({
  deleteKnowledgeBase: (...args: unknown[]) => deleteKnowledgeBase(...args),
}));

vi.mock("@/lib/db", () => ({
  createDbPool: () => ({
    query: (...args: unknown[]) => poolQuery(...args),
  }),
}));

describe("deleteUserAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserSubscription.mockResolvedValue({
      plan: "pro",
      polarSubscriptionId: "sub_123",
    });
    listUserKnowledgeBaseRecords.mockResolvedValue([]);
    poolQuery.mockResolvedValue({ rows: [] });
    revokePolarSubscription.mockResolvedValue(undefined);
  });

  it("revokes the Polar subscription before deleting the user", async () => {
    await deleteUserAccount("42");

    expect(revokePolarSubscription).toHaveBeenCalledWith("sub_123");
    expect(poolQuery).toHaveBeenCalledWith(`DELETE FROM users WHERE id = $1`, ["42"]);
  });

  it("skips Polar revoke when no subscription id is linked", async () => {
    getUserSubscription.mockResolvedValue({ plan: "free" });

    await deleteUserAccount("42");

    expect(revokePolarSubscription).not.toHaveBeenCalled();
    expect(poolQuery).toHaveBeenCalled();
  });

  it("does not delete the user when Polar revoke fails", async () => {
    revokePolarSubscription.mockRejectedValue(
      new PolarSubscriptionError("Could not cancel your billing subscription.")
    );

    await expect(deleteUserAccount("42")).rejects.toThrow(PolarSubscriptionError);
    expect(poolQuery).not.toHaveBeenCalled();
  });
});
