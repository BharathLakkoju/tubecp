import { afterEach, describe, expect, it } from "vitest";
import {
  getPolarProductStatus,
  getPricingPlans,
  isTeamPlanPublic,
  planIdFromPolarProductId,
  resolvePolarProductId,
} from "@/lib/plans";

describe("getPricingPlans", () => {
  const originalPro = process.env.POLAR_PRODUCT_ID_PRO;
  const originalResearcher = process.env.POLAR_PRODUCT_ID_RESEARCHER;
  const originalTeam = process.env.POLAR_PRODUCT_ID_TEAM;
  const originalTeamPublic = process.env.NEXT_PUBLIC_TEAM_PLAN_ENABLED;

  afterEach(() => {
    process.env.POLAR_PRODUCT_ID_PRO = originalPro;
    process.env.POLAR_PRODUCT_ID_RESEARCHER = originalResearcher;
    process.env.POLAR_PRODUCT_ID_TEAM = originalTeam;
    process.env.NEXT_PUBLIC_TEAM_PLAN_ENABLED = originalTeamPublic;
  });

  it("always includes free", () => {
    delete process.env.POLAR_PRODUCT_ID_PRO;
    delete process.env.POLAR_PRODUCT_ID_RESEARCHER;
    delete process.env.POLAR_PRODUCT_ID_TEAM;

    const plans = getPricingPlans();
    expect(plans.map((plan) => plan.id)).toEqual(["free"]);
  });

  it("includes paid tiers only when Polar product IDs are configured", () => {
    process.env.POLAR_PRODUCT_ID_PRO = "prod_pro";
    delete process.env.POLAR_PRODUCT_ID_RESEARCHER;
    delete process.env.POLAR_PRODUCT_ID_TEAM;

    const plans = getPricingPlans();
    expect(plans.map((plan) => plan.id)).toEqual(["free", "pro"]);
  });

  it("hides team tier by default even when Polar product ID is set", () => {
    delete process.env.NEXT_PUBLIC_TEAM_PLAN_ENABLED;
    process.env.POLAR_PRODUCT_ID_PRO = "prod_pro";
    process.env.POLAR_PRODUCT_ID_RESEARCHER = "prod_researcher";
    process.env.POLAR_PRODUCT_ID_TEAM = "prod_team";

    const plans = getPricingPlans();
    expect(plans.map((plan) => plan.id)).toEqual(["free", "pro", "researcher"]);
    expect(isTeamPlanPublic()).toBe(false);
  });

  it("includes team tier when explicitly enabled", () => {
    process.env.NEXT_PUBLIC_TEAM_PLAN_ENABLED = "true";
    process.env.POLAR_PRODUCT_ID_PRO = "prod_pro";
    process.env.POLAR_PRODUCT_ID_RESEARCHER = "prod_researcher";
    process.env.POLAR_PRODUCT_ID_TEAM = "prod_team";

    const plans = getPricingPlans();
    expect(plans.map((plan) => plan.id)).toEqual(["free", "pro", "researcher", "team"]);
    expect(isTeamPlanPublic()).toBe(true);
  });

  it("reads polar product ids at call time", () => {
    process.env.POLAR_PRODUCT_ID_TEAM = "prod_team_runtime";
    expect(resolvePolarProductId("team")).toBe("prod_team_runtime");
  });

  it("maps polar product ids back to plan ids", () => {
    process.env.POLAR_PRODUCT_ID_PRO = "prod_pro";
    process.env.POLAR_PRODUCT_ID_RESEARCHER = "prod_researcher";
    process.env.POLAR_PRODUCT_ID_TEAM = "prod_team";

    expect(planIdFromPolarProductId("prod_researcher")).toBe("researcher");
    expect(planIdFromPolarProductId("unknown")).toBeUndefined();
  });

  it("reports polar product status", () => {
    process.env.POLAR_PRODUCT_ID_PRO = "prod_pro";
    process.env.POLAR_PRODUCT_ID_RESEARCHER = "";
    delete process.env.POLAR_PRODUCT_ID_TEAM;

    expect(getPolarProductStatus()).toEqual({
      pro: true,
      researcher: false,
      team: false,
    });
  });
});
