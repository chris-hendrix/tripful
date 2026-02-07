import { test, expect } from "@playwright/test";
import { authenticateUser } from "./helpers/auth";

/**
 * E2E Test Suite: App Shell (Header, Navigation, Skip Link, Main Landmark)
 *
 * Tests the app shell structure on authenticated pages.
 */

test.describe("App Shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("header is visible on dashboard page with Tripful wordmark", async ({
    page,
    request,
  }) => {
    await authenticateUser(page, request);

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
    await authenticateUser(page, request);

    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    const dashboardLink = nav.locator('a:has-text("Dashboard")');
    await expect(dashboardLink).toBeVisible();
  });

  test("main content area has correct id for skip link", async ({
    page,
    request,
  }) => {
    await authenticateUser(page, request);

    const main = page.locator("main#main-content");
    await expect(main).toBeVisible();
  });

  test("user menu opens when avatar button is clicked", async ({
    page,
    request,
  }) => {
    await authenticateUser(page, request);

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
    await authenticateUser(page, request);

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
    await authenticateUser(page, request);

    // Skip link should exist in the DOM (even if visually hidden)
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toHaveCount(1);
    await expect(skipLink).toHaveText("Skip to main content");
  });
});
