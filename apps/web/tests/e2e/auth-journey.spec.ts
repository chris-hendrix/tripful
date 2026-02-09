import { test, expect } from "@playwright/test";
import { authenticateUser, generateUniquePhone } from "./helpers/auth";
import { LoginPage, DashboardPage } from "./helpers/pages";
import { snap } from "./helpers/screenshots";
import { removeNextjsDevOverlay } from "./helpers/nextjs-dev";
import { formatPhoneNumber } from "../../src/lib/format";

/**
 * E2E Journey: Authentication
 *
 * Tests the complete authentication flow using browser-based auth
 * (since this IS the test of the login UI).
 */

test.describe("Auth Journey", () => {
  test.beforeEach(async ({ page }) => {
    await removeNextjsDevOverlay(page);
    await page.context().clearCookies();
  });

  test("complete auth journey", { tag: "@smoke" }, async ({ page }) => {
    const phone = generateUniquePhone();
    const loginPage = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await test.step("login page renders correctly", async () => {
      await loginPage.goto();
      await expect(loginPage.heading).toBeVisible();
      await snap(page, "01-login");
    });

    await test.step("enter phone and submit", async () => {
      await loginPage.phoneInput.fill(phone);
      await loginPage.continueButton.click();
    });

    await test.step("verify code page shows phone number", async () => {
      await page.waitForURL("**/verify**");
      expect(page.url()).toContain("/verify?phone=");
      await expect(loginPage.verifyHeading).toBeVisible();
      await expect(page.getByText(formatPhoneNumber(phone))).toBeVisible();
      await snap(page, "02-verify-code");
    });

    await test.step("enter verification code", async () => {
      await loginPage.codeInput.fill("123456");
      await loginPage.verifyButton.click();
    });

    await test.step("complete profile for new user", async () => {
      await page.waitForURL("**/complete-profile");
      await expect(loginPage.completeProfileHeading).toBeVisible();
      await snap(page, "03-complete-profile");
      await loginPage.completeProfile("Test User");
    });

    await test.step("lands on dashboard", async () => {
      await page.waitForURL("**/dashboard");
      await expect(dashboard.heading).toBeVisible();
      await snap(page, "04-dashboard-empty");
    });

    await test.step("auth cookie is set correctly", async () => {
      const cookies = await page.context().cookies();
      const authCookie = cookies.find((c) => c.name === "auth_token");
      expect(authCookie).toBeDefined();
      expect(authCookie?.httpOnly).toBe(true);
      expect(authCookie?.value).toBeTruthy();
    });

    await test.step("logout clears session and redirects", async () => {
      await dashboard.logout();
      await page.waitForURL("**/login");
      expect(page.url()).toContain("/login");

      const cookies = await page.context().cookies();
      const authCookie = cookies.find((c) => c.name === "auth_token");
      if (authCookie) {
        expect(authCookie.value).toBe("");
      }
    });

    await test.step("cannot access protected route after logout", async () => {
      await page.goto("/dashboard");
      await page.waitForURL("**/login", { timeout: 5000 });
      expect(page.url()).toContain("/login");
    });
  });

  test("auth guards", async ({ page, request }) => {
    const loginPage = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await test.step("unauthenticated user redirects to login", async () => {
      await page.goto("/dashboard");
      await page.waitForURL("**/login", { timeout: 5000 });
      expect(page.url()).toContain("/login");
      await expect(loginPage.heading).toBeVisible();
    });

    await test.step("existing user skips complete-profile", async () => {
      await authenticateUser(page, request, "Existing User");
      await expect(dashboard.heading).toBeVisible();
    });
  });
});
