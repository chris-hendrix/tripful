import { test, expect } from "@playwright/test";
import { authenticateViaAPI, createUserViaAPI, generateUniquePhone } from "./helpers/auth";
import { createTripViaAPI } from "./helpers/invitations";
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
 * Also tests themed trip display on the detail page.
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

  test(
    "themed trip hero gradient renders without cover image",
    { tag: "@regression" },
    async ({ page, request }) => {
      test.slow();
      const tripDetail = new TripDetailPage(page);

      // Create user and trip via API with theme fields
      const phone = generateUniquePhone();
      const cookie = await createUserViaAPI(request, phone, "Theme Hero User");
      const tripName = `Vegas Trip ${Date.now()}`;
      const tripId = await createTripViaAPI(request, cookie, {
        name: tripName,
        destination: "Las Vegas, NV",
        startDate: "2026-11-20",
        endDate: "2026-11-23",
        themeColor: "#e94560",
        themeIcon: "\uD83C\uDFB0",
        themeFont: "bold-sans",
      });

      // Inject the trip creator's auth cookie into the browser
      const token = cookie.match(/auth_token=([^;]+)/)?.[1] || "";
      await page.context().addCookies([
        {
          name: "auth_token",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
        },
      ]);

      await tripDetail.goto(tripId);

      await test.step("verify hero gradient background", async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: tripName }),
        ).toBeVisible({ timeout: NAVIGATION_TIMEOUT });

        // The hero section should have a gradient background (theme+no-cover state)
        // The gradient div uses inline style with the heroGradient value
        const heroGradient = page.locator(
          '.relative.overflow-hidden > div[style*="linear-gradient"]',
        );
        await expect(heroGradient).toBeVisible({ timeout: ELEMENT_TIMEOUT });
      });

      await test.step("verify theme icon in hero", async () => {
        // Theme icon should be visible as a decorative element
        const themeIcon = page.getByText("\uD83C\uDFB0");
        await expect(themeIcon).toBeVisible({ timeout: ELEMENT_TIMEOUT });
      });

      await test.step("verify theme font on title", async () => {
        const heading = page.getByRole("heading", {
          level: 1,
          name: tripName,
        });
        // The heading should have an inline style with fontFamily for "bold-sans" (Oswald)
        await expect(heading).toHaveAttribute("style", /font-family/i);
      });

      await test.step("verify accent color override on wrapper", async () => {
        // The outermost wrapper div should have CSS custom property overrides
        const wrapper = page.locator(
          'div[style*="--color-primary"]',
        );
        await expect(wrapper).toBeVisible({ timeout: ELEMENT_TIMEOUT });

        // Verify the custom property value contains the theme color
        const style = await wrapper.getAttribute("style");
        expect(style).toContain("#e94560");

        await snap(page, "50-themed-trip-hero-gradient");
      });
    },
  );

  test(
    "edit trip theme via edit dialog",
    { tag: "@regression" },
    async ({ page, request }) => {
      test.slow();
      const tripDetail = new TripDetailPage(page);

      // Create user and trip via API with Bachelor Party theme
      const phone = generateUniquePhone();
      const cookie = await createUserViaAPI(request, phone, "Theme Edit User");
      const tripName = `Themed Trip ${Date.now()}`;
      const tripId = await createTripViaAPI(request, cookie, {
        name: tripName,
        destination: "Las Vegas, NV",
        startDate: "2026-11-20",
        endDate: "2026-11-23",
        themeColor: "#e94560",
        themeIcon: "\uD83C\uDFB0",
        themeFont: "bold-sans",
      });

      // Inject auth cookie into the browser
      const token = cookie.match(/auth_token=([^;]+)/)?.[1] || "";
      await page.context().addCookies([
        {
          name: "auth_token",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
        },
      ]);

      await tripDetail.goto(tripId);

      await test.step("open edit dialog and verify existing theme", async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: tripName }),
        ).toBeVisible({ timeout: NAVIGATION_TIMEOUT });

        await expect(async () => {
          await tripDetail.editButton.click();
          await expect(tripDetail.editDialogHeading).toBeVisible({
            timeout: RETRY_INTERVAL,
          });
        }).toPass({ timeout: ELEMENT_TIMEOUT });

        // ThemePreviewCard should be visible with "Change theme" button
        await expect(page.getByText("Change theme")).toBeVisible({
          timeout: ELEMENT_TIMEOUT,
        });
        // "Add a theme" should NOT be visible
        await expect(page.getByText("Add a theme")).not.toBeVisible();

        await snap(page, "51-edit-trip-existing-theme");
      });

      await test.step("change theme to Bachelorette Party", async () => {
        await page.getByText("Change theme").click();

        // The TemplatePicker Sheet should open
        await expect(
          page.getByRole("heading", { name: "Choose a Theme" }),
        ).toBeVisible({ timeout: ELEMENT_TIMEOUT });

        // Select Bachelorette Party template
        await page
          .getByRole("button", { name: "Bachelorette Party" })
          .click();
      });

      await test.step("verify preview card updates", async () => {
        // After selecting, picker closes and preview card shows new theme
        await expect(page.getByText("Change theme")).toBeVisible({
          timeout: ELEMENT_TIMEOUT,
        });

        // The preview card should show the Bachelorette Party font name
        await expect(page.getByText("Playful")).toBeVisible();

        await snap(page, "52-edit-trip-changed-theme");
      });

      await test.step("submit form and verify changes persisted", async () => {
        await tripDetail.updateTripButton.click();

        // Wait for dialog to close and page to refresh
        await expect(tripDetail.editDialogHeading).not.toBeVisible({
          timeout: ELEMENT_TIMEOUT,
        });

        // Verify the trip detail page reflects the new Bachelorette Party theme
        // The accent color override should contain the bachelorette pink color
        const wrapper = page.locator('div[style*="--color-primary"]');
        await expect(wrapper).toBeVisible({ timeout: ELEMENT_TIMEOUT });
        const style = await wrapper.getAttribute("style");
        expect(style).toContain("#ff69b4");

        await snap(page, "53-edit-trip-theme-persisted");
      });
    },
  );

  test(
    "remove trip theme via edit dialog",
    { tag: "@regression" },
    async ({ page, request }) => {
      test.slow();
      const tripDetail = new TripDetailPage(page);

      // Create user and trip via API with Bachelor Party theme
      const phone = generateUniquePhone();
      const cookie = await createUserViaAPI(request, phone, "Theme Remove User");
      const tripName = `Remove Theme ${Date.now()}`;
      const tripId = await createTripViaAPI(request, cookie, {
        name: tripName,
        destination: "Miami, FL",
        startDate: "2026-12-01",
        endDate: "2026-12-05",
        themeColor: "#e94560",
        themeIcon: "\uD83C\uDFB0",
        themeFont: "bold-sans",
      });

      // Inject auth cookie into the browser
      const token = cookie.match(/auth_token=([^;]+)/)?.[1] || "";
      await page.context().addCookies([
        {
          name: "auth_token",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
        },
      ]);

      await tripDetail.goto(tripId);

      await test.step("open edit dialog and verify existing theme", async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: tripName }),
        ).toBeVisible({ timeout: NAVIGATION_TIMEOUT });

        await expect(async () => {
          await tripDetail.editButton.click();
          await expect(tripDetail.editDialogHeading).toBeVisible({
            timeout: RETRY_INTERVAL,
          });
        }).toPass({ timeout: ELEMENT_TIMEOUT });

        await expect(page.getByText("Change theme")).toBeVisible({
          timeout: ELEMENT_TIMEOUT,
        });
      });

      await test.step("open picker and select no theme", async () => {
        await page.getByText("Change theme").click();

        await expect(
          page.getByRole("heading", { name: "Choose a Theme" }),
        ).toBeVisible({ timeout: ELEMENT_TIMEOUT });

        // Click the "No theme" option
        await page.getByText("No theme").click();
      });

      await test.step("verify Add a theme button is now visible", async () => {
        // After removing theme, "Add a theme" button should appear
        await expect(page.getByText("Add a theme")).toBeVisible({
          timeout: ELEMENT_TIMEOUT,
        });
        // "Change theme" should NOT be visible
        await expect(page.getByText("Change theme")).not.toBeVisible();

        await snap(page, "54-edit-trip-theme-removed");
      });

      await test.step("submit form and verify theme was removed", async () => {
        await tripDetail.updateTripButton.click();

        // Wait for dialog to close
        await expect(tripDetail.editDialogHeading).not.toBeVisible({
          timeout: ELEMENT_TIMEOUT,
        });

        // The accent color override div should NOT be present anymore
        // since the theme was removed
        const wrapper = page.locator('div[style*="--color-primary"]');
        await expect(wrapper).not.toBeVisible({ timeout: ELEMENT_TIMEOUT });

        await snap(page, "55-edit-trip-theme-removed-persisted");
      });
    },
  );
});
