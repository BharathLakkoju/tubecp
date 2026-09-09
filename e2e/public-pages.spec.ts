import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("home page loads with hero and sign-in CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/knowledge base/i);
    await expect(
      page.getByRole("button", { name: "Sign in to start researching" })
    ).toBeVisible();
  });

  test("pricing page shows all plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /pricing/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Researcher" })).toBeVisible();
    await expect(page.getByRole("link", { name: /upgrade to pro/i })).toBeVisible();
  });

  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");

    if (process.env.CLERK_E2E_ENABLED === "true") {
      await expect(page.locator(".cl-rootBox, [data-clerk-component]")).toBeVisible({
        timeout: 15_000,
      });
      return;
    }

    await expect(page.getByTestId("e2e-sign-in")).toBeVisible();
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("health API returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.platform).toBe("vercel-serverless");
  });
});
