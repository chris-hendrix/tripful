import { test, expect } from "@playwright/test";
import { authenticateViaAPI } from "./helpers/auth";
import { TripsPage, TripDetailPage } from "./helpers/pages";
import { snap } from "./helpers/screenshots";
import { removeNextjsDevOverlay } from "./helpers/nextjs-dev";
import { pickDate } from "./helpers/date-pickers";
import {
  NAVIGATION_TIMEOUT,
  ELEMENT_TIMEOUT,
  RETRY_INTERVAL,
} from "./helpers/timeouts";

/**
 * E2E: Trip Theme Integration
 *
 * Tests theme selection during trip creation — both auto-detected
 * templates (keyword match) and manual theme selection via the picker.
 */

test.describe("Trip Theme", () => {
  test.beforeEach(async ({ page }) => {
    await removeNextjsDevOverlay(page);
    await page.context().clearCookies();
  });

  test(
    "create trip with auto-detected template theme",
    { tag: "@regression" },
    async ({ page, request }) => {
      test.slow();
      const trips = new TripsPage(page);
      const tripDetail = new TripDetailPage(page);
      await authenticateViaAPI(page, request, "Theme Auto User");

      const tripName = `Bachelor Party ${Date.now()}`;
      const tripDestination = "Las Vegas, NV";

      await test.step("open create trip dialog and fill Step 1", async () => {
        await expect(async () => {
          await trips.createTripButton.click();
          await expect(tripDetail.createDialogHeading).toBeVisible({
            timeout: RETRY_INTERVAL,
          });
        }).toPass({ timeout: ELEMENT_TIMEOUT });

        await expect(tripDetail.step1Indicator).toBeVisible();

        await tripDetail.nameInput.fill(tripName);
        await tripDetail.destinationInput.fill(tripDestination);
        await pickDate(page, tripDetail.startDateButton, "2026-11-20");
        await pickDate(page, tripDetail.endDateButton, "2026-11-23");
      });

      await test.step("continue to Step 2 and verify auto-detected theme", async () => {
        await tripDetail.continueButton.click();
        await expect(tripDetail.step2Indicator).toBeVisible();
        await expect(page.getByText("Details & settings")).toBeVisible();

        // "Bachelor" keyword should auto-detect the bachelor-party template.
        // The ThemePreviewCard should be visible with a "Change theme" button.
        await expect(page.getByText("Change theme")).toBeVisible({
          timeout: ELEMENT_TIMEOUT,
        });

        // The "Add a theme" button should NOT be visible since theme was auto-detected
        await expect(page.getByText("Add a theme")).not.toBeVisible();

        await snap(page, "40-create-trip-auto-theme");
      });

      await test.step("submit trip and verify creation", async () => {
        await tripDetail.createTripButton.click();

        await page.waitForURL("**/trips/**", { timeout: NAVIGATION_TIMEOUT });
        expect(page.url()).toContain("/trips/");

        await expect(
          page.getByRole("heading", { level: 1, name: tripName }),
        ).toBeVisible({ timeout: NAVIGATION_TIMEOUT });
      });
    },
  );

  test(
    "create trip with manually selected theme",
    { tag: "@regression" },
    async ({ page, request }) => {
      test.slow();
      const trips = new TripsPage(page);
      const tripDetail = new TripDetailPage(page);
      await authenticateViaAPI(page, request, "Theme Manual User");

      const tripName = `Team Retreat ${Date.now()}`;
      const tripDestination = "Sedona, AZ";

      await test.step("open create trip dialog and fill Step 1", async () => {
        await expect(async () => {
          await trips.createTripButton.click();
          await expect(tripDetail.createDialogHeading).toBeVisible({
            timeout: RETRY_INTERVAL,
          });
        }).toPass({ timeout: ELEMENT_TIMEOUT });

        await expect(tripDetail.step1Indicator).toBeVisible();

        await tripDetail.nameInput.fill(tripName);
        await tripDetail.destinationInput.fill(tripDestination);
        await pickDate(page, tripDetail.startDateButton, "2026-12-05");
        await pickDate(page, tripDetail.endDateButton, "2026-12-08");
      });

      await test.step("continue to Step 2 and verify no auto-detected theme", async () => {
        await tripDetail.continueButton.click();
        await expect(tripDetail.step2Indicator).toBeVisible();
        await expect(page.getByText("Details & settings")).toBeVisible();

        // "Team Retreat" does not match any template keywords,
        // so the "Add a theme" button should be visible
        await expect(page.getByText("Add a theme")).toBeVisible({
          timeout: ELEMENT_TIMEOUT,
        });

        // "Change theme" should NOT be visible since no theme is set
        await expect(page.getByText("Change theme")).not.toBeVisible();

        await snap(page, "41-create-trip-no-theme");
      });

      await test.step("open template picker and select a template", async () => {
        await page.getByText("Add a theme").click();

        // The TemplatePicker Sheet should open with "Choose a Theme" heading
        await expect(
          page.getByRole("heading", { name: "Choose a Theme" }),
        ).toBeVisible({ timeout: ELEMENT_TIMEOUT });

        await snap(page, "42-template-picker-open");

        // Select the first template (Bachelorette Party) from the grid
        await page
          .getByRole("button", { name: "Bachelorette Party" })
          .click();
      });

      await test.step("verify theme preview card appears", async () => {
        // After selecting a template, the picker should close
        // and the ThemePreviewCard should be visible
        await expect(page.getByText("Change theme")).toBeVisible({
          timeout: ELEMENT_TIMEOUT,
        });
        await expect(page.getByText("Add a theme")).not.toBeVisible();

        await snap(page, "43-create-trip-with-theme");
      });

      await test.step("submit trip and verify creation", async () => {
        await tripDetail.createTripButton.click();

        await page.waitForURL("**/trips/**", { timeout: NAVIGATION_TIMEOUT });
        expect(page.url()).toContain("/trips/");

        await expect(
          page.getByRole("heading", { level: 1, name: tripName }),
        ).toBeVisible({ timeout: NAVIGATION_TIMEOUT });
      });
    },
  );
});
