import { afterEach, describe, expect, it } from "vitest";
import {
  getPolarProductStatus,
  getPricingPlans,
  planIdFromPolarProductId,
  resolvePolarProductId,
} from "@/lib/plans";

describe("getPricingPlans", () => {
  const originalPro = process.env.POLAR_PRODUCT_ID_PRO;
  const originalResearcher = process.env.POLAR_PRODUCT_ID_RESEARCHER;
  const originalTeam = process.env.POLAR_PRODUCT_ID_TEAM;

  afterEach(() => {
    process.env.POLAR_PRODUCT_ID_PRO = originalPro;
    process.env.POLAR_PRODUCT_ID_RESEARCHER = originalResearcher;
    process.env.POLAR_PRODUCT_ID_TEAM = originalTeam;
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

  it("includes team tier when POLAR_PRODUCT_ID_TEAM is set", () => {
    process.env.POLAR_PRODUCT_ID_PRO = "prod_pro";
    process.env.POLAR_PRODUCT_ID_RESEARCHER = "prod_researcher";
    process.env.POLAR_PRODUCT_ID_TEAM = "prod_team";

    const plans = getPricingPlans();
    expect(plans.map((plan) => plan.id)).toEqual(["free", "pro", "researcher", "team"]);
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
