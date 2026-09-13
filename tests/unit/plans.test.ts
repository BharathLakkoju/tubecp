import { afterEach, describe, expect, it } from "vitest";
import { getPolarProductStatus, getPricingPlans, PLANS } from "@/lib/plans";

describe("getPricingPlans", () => {
  const originalPro = process.env.POLAR_PRODUCT_ID_PRO;
  const originalResearcher = process.env.POLAR_PRODUCT_ID_RESEARCHER;

  afterEach(() => {
    process.env.POLAR_PRODUCT_ID_PRO = originalPro;
    process.env.POLAR_PRODUCT_ID_RESEARCHER = originalResearcher;
    PLANS.pro.polarProductId = originalPro;
    PLANS.researcher.polarProductId = originalResearcher;
  });

  it("always includes free", () => {
    delete process.env.POLAR_PRODUCT_ID_PRO;
    delete process.env.POLAR_PRODUCT_ID_RESEARCHER;
    PLANS.pro.polarProductId = undefined;
    PLANS.researcher.polarProductId = undefined;

    const plans = getPricingPlans();
    expect(plans.map((plan) => plan.id)).toEqual(["free"]);
  });

  it("includes paid tiers only when Polar product IDs are configured", () => {
    PLANS.pro.polarProductId = "prod_pro";
    PLANS.researcher.polarProductId = undefined;

    const plans = getPricingPlans();
    expect(plans.map((plan) => plan.id)).toEqual(["free", "pro"]);
  });

  it("reports polar product status", () => {
    PLANS.pro.polarProductId = "prod_pro";
    PLANS.researcher.polarProductId = "";

    expect(getPolarProductStatus()).toEqual({
      pro: true,
      researcher: false,
      team: false,
    });
  });
});
