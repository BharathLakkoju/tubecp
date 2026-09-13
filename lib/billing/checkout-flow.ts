import { isTeamPlanOffered, type PlanId } from "@/lib/plans";

export type PaidPlanId = "pro" | "researcher" | "team";

export function isPaidPlan(plan: string | undefined): plan is PaidPlanId {
  return plan === "pro" || plan === "researcher" || plan === "team";
}

/** Paid plans that can be purchased or upgraded to from the product UI. */
export function isCheckoutPlan(plan: string | undefined): plan is PaidPlanId {
  return isPaidPlan(plan) && isTeamPlanOffered(plan);
}

export function checkoutPathForPlan(plan: PaidPlanId): string {
  return `/api/checkout?plan=${plan}`;
}

/** Prevent open redirects — only allow same-site relative paths we expect after auth. */
export function safeCallbackPath(input: string | undefined | null): string {
  if (!input) return "/app";
  if (!input.startsWith("/") || input.startsWith("//")) return "/app";
  if (input.startsWith("/api/checkout")) return input;
  if (input === "/app" || input.startsWith("/app?")) return input;
  return "/app";
}

export function resolveAuthCallbackUrl(params: {
  callbackUrl?: string;
  plan?: string;
}): string {
  if (params.callbackUrl) {
    return safeCallbackPath(params.callbackUrl);
  }
  if (isCheckoutPlan(params.plan)) {
    return checkoutPathForPlan(params.plan);
  }
  return "/app";
}

export function signInPathForCheckout(plan: PaidPlanId): string {
  const callback = encodeURIComponent(checkoutPathForPlan(plan));
  return `/sign-in?callbackUrl=${callback}`;
}

export function isCheckoutCallback(callbackUrl: string): boolean {
  return callbackUrl.startsWith("/api/checkout");
}

export function authLinkWithCallback(
  path: "/sign-in" | "/sign-up",
  callbackUrl: string
): string {
  return `${path}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
