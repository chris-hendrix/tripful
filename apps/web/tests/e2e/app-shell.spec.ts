import { test, expect } from "@playwright/test";
import { authenticateViaAPI } from "./helpers/auth";
import { TripsPage } from "./helpers/pages";
import { removeNextjsDevOverlay } from "./helpers/nextjs-dev";

/**
 * E2E Journey: App Shell
 *
 * Tests header, navigation, user menu, skip link, and main landmark
 * in a single journey test with granular test.step() reporting.
 */

test.describe("App Shell", () => {
  test.beforeEach(async ({ page }) => {
    await removeNextjsDevOverlay(page);
    await page.context().clearCookies();
  });

  test(
    "app shell structure and navigation",
    { tag: "@smoke" },
    async ({ page, request }) => {
      const trips = new TripsPage(page);
      await authenticateViaAPI(page, request);

      await test.step("header with Tripful wordmark is visible", async () => {
        const header = page.locator("header").filter({
          has: page.getByRole("navigation", { name: "Main navigation" }),
        });
        await expect(header).toBeVisible();

        const wordmark = header.getByRole("link", { name: "Tripful" });
        await expect(wordmark).toBeVisible();
      });

      await test.step("navigation contains My Trips link", async () => {
        const nav = page.getByRole("navigation", { name: "Main navigation" });
        await expect(nav).toBeVisible();

        const myTripsLink = nav.getByRole("link", { name: "My Trips" });
        await expect(myTripsLink).toBeVisible();
      });

      await test.step("main content area has correct id", async () => {
        const main = page.locator("main#main-content");
        await expect(main).toBeVisible();
      });

      await test.step("user menu opens with profile and logout", async () => {
        await trips.openUserMenu();
        await expect(trips.profileItem).toBeVisible({ timeout: 10000 });
        await expect(trips.logoutItem).toBeVisible();
        await expect(page.getByText("Test User")).toBeVisible();
      });

      await test.step("skip link exists and targets main content", async () => {
        const skipLink = page.locator('a[href="#main-content"]');
        await expect(skipLink).toHaveCount(1);
        await expect(skipLink).toHaveText("Skip to main content");
      });
    },
  );
});
