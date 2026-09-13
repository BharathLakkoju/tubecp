import { AlreadyCanceledSubscription } from "@polar-sh/sdk/models/errors/alreadycanceledsubscription.js";
import { ResourceNotFound } from "@polar-sh/sdk/models/errors/resourcenotfound.js";
import { isProduction } from "@/lib/env";
import { getPolarClient } from "@/lib/polar";

export class PolarSubscriptionError extends Error {
  code = "BILLING_CANCEL_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "PolarSubscriptionError";
  }
}

function isPolarBillingConfigured(): boolean {
  return Boolean(process.env.POLAR_ACCESS_TOKEN);
}

/** Immediately revoke a Polar subscription (used when deleting an account). */
export async function revokePolarSubscription(polarSubscriptionId: string): Promise<void> {
  if (!isPolarBillingConfigured()) {
    if (isProduction()) {
      throw new PolarSubscriptionError(
        "Unable to cancel your billing subscription. Please contact support before deleting your account."
      );
    }
    return;
  }

  const polar = getPolarClient();

  try {
    await polar.subscriptions.revoke({ id: polarSubscriptionId });
  } catch (err) {
    if (err instanceof AlreadyCanceledSubscription || err instanceof ResourceNotFound) {
      return;
    }

    console.error("Failed to revoke Polar subscription:", err);
    throw new PolarSubscriptionError(
      "Could not cancel your billing subscription. Please try again or contact support."
    );
  }
}

/** Schedule cancellation at the end of the current billing period. */
export async function cancelPolarSubscriptionAtPeriodEnd(
  polarSubscriptionId: string
): Promise<void> {
  const polar = getPolarClient();
  await polar.subscriptions.update({
    id: polarSubscriptionId,
    subscriptionUpdate: {
      cancelAtPeriodEnd: true,
    },
  });
}

export type PolarPlanChangeMode = "upgrade" | "downgrade_at_period_end";

/** Change subscription product — upgrades prorate immediately; downgrades apply next period. */
export async function changePolarSubscriptionProduct(
  polarSubscriptionId: string,
  productId: string,
  mode: PolarPlanChangeMode
) {
  if (!isPolarBillingConfigured()) {
    if (isProduction()) {
      throw new PolarSubscriptionError("Billing is not configured. Please contact support.");
    }
    return null;
  }

  const polar = getPolarClient();

  try {
    return await polar.subscriptions.update({
      id: polarSubscriptionId,
      subscriptionUpdate: {
        productId,
        prorationBehavior: mode === "upgrade" ? "prorate" : "next_period",
      },
    });
  } catch (err) {
    if (err instanceof ResourceNotFound) {
      throw new PolarSubscriptionError(
        "Your billing subscription could not be found. Please contact support."
      );
    }

    console.error("Failed to change Polar subscription product:", err);
    throw new PolarSubscriptionError(
      "Could not update your subscription. Please try again or contact support."
    );
  }
}
