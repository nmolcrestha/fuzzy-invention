import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. They run against a production build (`pnpm build` first) with the demo
 * account from `pnpm db:seed`. Every test site's address starts with "e2e-"; they're deleted
 * when the run ends.
 */
export default defineConfig({
  testDir: "e2e",
  // One demo account and one database: run serially so tests never step on each other.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    storageState: "e2e/.auth/demo.json",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
    // PW_SERVER_LOGS=1 shows the server's console (e.g. development emails).
    stdout: process.env.PW_SERVER_LOGS ? "pipe" : "ignore",
  },
});
