import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Test execution settings
  fullyParallel: false, // Run tests sequentially to avoid database conflicts
  forbidOnly: !!process.env.CI, // Fail if test.only is left in CI
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI
  workers: 1, // Run tests in sequence to avoid race conditions

  // Reporter to use
  reporter: 'html',

  // Shared settings for all tests
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Auto-start servers for e2e tests
  // Reuse existing dev servers locally, start fresh in CI
  webServer: [
    {
      command: 'cd ../api && NODE_ENV=test pnpm dev',
      url: 'http://localhost:8000/api/health',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
