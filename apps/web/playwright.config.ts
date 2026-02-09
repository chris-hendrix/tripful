import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // Fail if test.only is left in CI
  retries: 0, // Fail fast — no retries
  ...(process.env.CI ? { workers: 2 } : {}), // Auto-detect locally, 2 in CI

  // Reporter to use
  reporter: "html",

  // Shared settings for all tests
  use: {
    // Base URL for navigation
    baseURL: "http://localhost:3000",

    // Use a consistent non-UTC timezone so trip timezone differs from user
    // timezone (set to UTC by auth helper), ensuring timezone selector tests work
    timezoneId: "America/Chicago",

    // Collect trace on failure
    trace: "retain-on-failure",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "retain-on-failure",
  },

  // Configure projects for different browsers
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 1080 }, // Increased from 720 to 1080 for better E2E reliability
      },
    },
  ],

  // Auto-start servers for e2e tests
  // Reuse existing dev servers locally, start fresh in CI
  webServer: [
    {
      command: "cd ../api && NODE_ENV=test pnpm dev",
      url: "http://localhost:8000/api/health",
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "pnpm dev",
      url: "http://localhost:3000",
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
