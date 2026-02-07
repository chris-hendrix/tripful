import { test, expect } from "@playwright/test";

/**
 * E2E Test Suite: App Shell (Header, Navigation, Skip Link, Main Landmark)
 *
 * Tests the app shell structure on authenticated pages.
 */

test.describe("App Shell", () => {
  // Helper to complete full auth flow and land on dashboard
  async function loginAndNavigateToDashboard(
    page: import("@playwright/test").Page,
    request: import("@playwright/test").APIRequestContext,
  ) {
    const phone = `+1555${Date.now()}`;

    // Create user via API for speed
    await request.post("http://localhost:8000/api/auth/request-code", {
      data: { phoneNumber: phone },
    });

    const verifyResponse = await request.post(
      "http://localhost:8000/api/auth/verify-code",
      {
        data: { phoneNumber: phone, code: "123456" },
      },
    );

    const cookies = verifyResponse.headers()["set-cookie"];

    await request.post("http://localhost:8000/api/auth/complete-profile", {
      data: { displayName: "Test User", timezone: "UTC" },
      headers: { cookie: cookies || "" },
    });

    // Login via the browser
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill(phone);
    await page.locator('button:has-text("Continue")').click();

    await page.waitForURL("**/verify**");
    const codeInput = page.locator('input[type="text"]').first();
    await codeInput.fill("123456");
    await page.locator('button:has-text("Verify")').click();

    await page.waitForURL("**/dashboard", { timeout: 10000 });
  }

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("header is visible on dashboard page with Tripful wordmark", async ({
    page,
    request,
  }) => {
    await loginAndNavigateToDashboard(page, request);

    // Verify header is visible
    const header = page.locator('header:has(nav[aria-label="Main navigation"])');
    await expect(header).toBeVisible();

    // Verify Tripful wordmark
    const wordmark = header.locator('a:has-text("Tripful")');
    await expect(wordmark).toBeVisible();
  });

  test("header contains Dashboard navigation link", async ({
    page,
    request,
  }) => {
    await loginAndNavigateToDashboard(page, request);

    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    const dashboardLink = nav.locator('a:has-text("Dashboard")');
    await expect(dashboardLink).toBeVisible();
  });

  test("main content area has correct id for skip link", async ({
    page,
    request,
  }) => {
    await loginAndNavigateToDashboard(page, request);

    const main = page.locator("main#main-content");
    await expect(main).toBeVisible();
  });

  test("user menu opens when avatar button is clicked", async ({
    page,
    request,
  }) => {
    await loginAndNavigateToDashboard(page, request);

    // Click user menu button
    const userMenuButton = page.locator('button[aria-label="User menu"]');
    await expect(userMenuButton).toBeVisible();
    await userMenuButton.click();

    // Verify dropdown items are visible
    await expect(page.locator('text="Profile"')).toBeVisible();
    await expect(page.locator('text="Log out"')).toBeVisible();

    // Verify user display name is shown
    await expect(page.locator('text="Test User"')).toBeVisible();
  });

  test("logout clears session and redirects to login", async ({
    page,
    request,
  }) => {
    await loginAndNavigateToDashboard(page, request);

    // Open user menu
    const userMenuButton = page.locator('button[aria-label="User menu"]');
    await userMenuButton.click();

    // Click Log out
    const logoutItem = page.locator('text="Log out"');
    await expect(logoutItem).toBeVisible();
    await logoutItem.click();

    // Should redirect to login
    await page.waitForURL("**/login", { timeout: 5000 });
    expect(page.url()).toContain("/login");
  });

  test("skip link exists and targets main content", async ({
    page,
    request,
  }) => {
    await loginAndNavigateToDashboard(page, request);

    // Skip link should exist in the DOM (even if visually hidden)
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toHaveCount(1);
    await expect(skipLink).toHaveText("Skip to main content");
  });
});
