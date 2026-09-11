import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("landing page loads with hero and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/youtube research/i);
    await expect(page.getByRole("link", { name: /start researching/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
  });

  test("app page loads sign-in prompt when signed out", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/sign in/i);
    await expect(page.getByRole("link", { name: /sign in to continue/i })).toBeVisible();
  });

  test("pricing page shows all plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /pricing/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Researcher" })).toBeVisible();
    await expect(page.getByRole("link", { name: /upgrade to pro/i })).toBeVisible();
    await expect(page.getByText(/terms of service/i)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Legal" })).toBeVisible();
  });

  test("legal pages load", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();

    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByText(/Neon/i)).toBeVisible();
    await expect(page.getByText(/Upstash/i)).toBeVisible();
    await expect(page.getByText(/OpenRouter/i)).toBeVisible();
    await expect(page.getByText(/YouTube/i)).toBeVisible();
    await expect(page.getByText(/Sentry/i)).toBeVisible();

    await page.goto("/refund");
    await expect(page.getByRole("heading", { name: "Cancellation Policy" })).toBeVisible();
    await expect(page.getByText(/non-refundable/i)).toBeVisible();
    await expect(page.getByText(/end of your current billing period/i)).toBeVisible();
  });

  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");

    if (process.env.E2E_AUTH_BYPASS === "true") {
      await expect(page.getByTestId("e2e-sign-in")).toBeVisible();
      await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
      return;
    }

    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with github/i })).toBeVisible();
  });

  test("sign-up page loads", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("health API returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.platform).toBe("vercel-serverless");
  });
});
