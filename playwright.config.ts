import { defineConfig, devices } from "@playwright/test";

/**
 * Local: set `reuseExistingServer` so an existing `npm run dev` is used when present;
 * otherwise Playwright starts the dev server. On CI, reuse is off.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    /** Dedicated port avoids clashes when another dev server holds 3000 (Next would bump to 3001). */
    baseURL: "http://localhost:3150",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "PORT=3150 npm run dev",
    url: "http://localhost:3150",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
