import { defineConfig, devices } from "@playwright/test";

/** Dedicated port so `npm run dev` on 3000 is never reused without E2E env vars. */
const PORT = process.env.PLAYWRIGHT_PORT ?? "3100";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: baseURL,
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
        timeout: 120_000,
        env: {
          ...process.env,
          PORT,
          E2E_AUTH_BYPASS: "true",
          E2E_STUB_APIS: "true",
          ADMIN_USER_IDS: "1",
          POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET ?? "whsec_e2e_test_secret",
          YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY ?? "test-youtube",
          OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? "test-openrouter",
        },
      },
});
