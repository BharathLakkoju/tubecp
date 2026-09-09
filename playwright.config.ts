import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "3000";
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
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          PORT,
          E2E_AUTH_BYPASS: "true",
          POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET ?? "whsec_e2e_test_secret",
          YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY ?? "test-youtube",
          OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? "test-openrouter",
        },
      },
});
