import { test, expect } from "@playwright/test";
import {
  authenticateViaAPI,
  authenticateViaAPIWithPhone,
  createUserViaAPI,
} from "./helpers/auth";
import { DashboardPage, TripDetailPage } from "./helpers/pages";
import { snap } from "./helpers/screenshots";

/**
 * E2E Journey: Trip CRUD, Permissions, and Validation
 *
 * Consolidates 10 individual trip tests into 3 journey tests.
 * Uses authenticateViaAPI for fast auth (no browser navigation).
 */

test.describe("Trip Journey", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test(
    "trip CRUD journey",
    { tag: "@smoke" },
    async ({ page, request }) => {
      const dashboard = new DashboardPage(page);
      const tripDetail = new TripDetailPage(page);
      await authenticateViaAPI(page, request, "Trip Creator");

      const tripName = `Test Trip ${Date.now()}`;
      const tripDestination = "Miami Beach, FL";
      const tripDescription = "A test trip for E2E verification";

      await test.step("create trip with full details", async () => {
        await dashboard.createTripButton.click();
        await expect(tripDetail.createDialogHeading).toBeVisible();
        await expect(tripDetail.step1Indicator).toBeVisible();
        await expect(page.getByText("Basic information")).toBeVisible();

        await tripDetail.nameInput.fill(tripName);
        await tripDetail.destinationInput.fill(tripDestination);
        await tripDetail.startDateInput.fill("2026-10-12");
        await tripDetail.endDateInput.fill("2026-10-14");
        await snap(page, "05-create-trip-step1");
        await tripDetail.continueButton.click();

        await expect(tripDetail.step2Indicator).toBeVisible();
        await expect(page.getByText("Details & settings")).toBeVisible();
        await tripDetail.descriptionInput.fill(tripDescription);
        await snap(page, "06-create-trip-step2");
        await tripDetail.createTripButton.click();

        await page.waitForURL("**/trips/**", { timeout: 15000 });
        expect(page.url()).toContain("/trips/");
      });

      await test.step("verify trip detail page", async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: tripName }),
        ).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(tripDestination)).toBeVisible();
        await expect(page.getByText("Oct 12 - 14, 2026")).toBeVisible();
        await expect(page.getByText(tripDescription)).toBeVisible();
        await expect(page.getByText("Going")).toBeVisible();
        await expect(page.getByText("Organizing")).toBeVisible();
        await snap(page, "07-trip-detail");
      });

      await test.step("trip appears in dashboard", async () => {
        await dashboard.goto();
        await expect(page.getByText(tripName)).toBeVisible();
        await expect(page.getByText(tripDestination)).toBeVisible();
        await expect(dashboard.upcomingTripsHeading).toBeVisible();
        await snap(page, "08-dashboard-with-trips");

        await page.getByText(tripName).click();
        await page.waitForURL("**/trips/**");
        await expect(
          page.getByRole("heading", { level: 1, name: tripName }),
        ).toBeVisible();
      });

      const updatedName = `Updated Trip ${Date.now()}`;
      const updatedDestination = "Los Angeles, CA";
      const updatedDescription = "Updated description with new information";

      await test.step("edit trip with pre-populated form", async () => {
        await tripDetail.editButton.click();
        await expect(tripDetail.editDialogHeading).toBeVisible();

        await expect(tripDetail.step1Indicator).toBeVisible();
        await expect(tripDetail.nameInput).toHaveValue(tripName);
        await expect(tripDetail.destinationInput).toHaveValue(tripDestination);
        await expect(tripDetail.startDateInput).toHaveValue("2026-10-12");
        await expect(tripDetail.endDateInput).toHaveValue("2026-10-14");

        await tripDetail.nameInput.fill(updatedName);
        await tripDetail.destinationInput.fill(updatedDestination);
        await tripDetail.continueButton.click();

        await expect(tripDetail.step2Indicator).toBeVisible();
        await expect(tripDetail.descriptionInput).toHaveValue(tripDescription);
        await tripDetail.descriptionInput.fill(updatedDescription);
        await tripDetail.updateTripButton.click();
      });

      await test.step("verify optimistic update and success", async () => {
        await expect(
          page.locator("h1").filter({ hasText: updatedName }),
        ).toBeVisible({ timeout: 1000 });
        await expect(
          page.getByText("Trip updated successfully"),
        ).toBeVisible();
        await expect(tripDetail.editDialogHeading).not.toBeVisible();

        await expect(page.getByText(updatedDestination)).toBeVisible();
        await expect(page.getByText("Oct 12 - 14, 2026")).toBeVisible();
        await expect(page.getByText(updatedDescription)).toBeVisible();
      });

      await test.step("changes persist in dashboard", async () => {
        await dashboard.goto();
        await expect(page.getByText(updatedName)).toBeVisible();
        await expect(page.getByText(updatedDestination)).toBeVisible();
        await expect(page.getByText(tripName)).not.toBeVisible();
      });

      await test.step("delete trip with cancel then confirm", async () => {
        await page.getByText(updatedName).click();
        await page.waitForURL("**/trips/**");

        await tripDetail.editButton.click();
        await expect(tripDetail.editDialogHeading).toBeVisible();
        await tripDetail.continueButton.click();
        await expect(tripDetail.step2Indicator).toBeVisible();

        // Click delete, then cancel
        await tripDetail.deleteTripButton.click();
        await expect(
          page.getByText("Are you sure you want to delete this trip?"),
        ).toBeVisible();
        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(
          page.getByText("Are you sure you want to delete this trip?"),
        ).not.toBeVisible();
        await expect(tripDetail.deleteTripButton).toBeVisible();

        // Click delete again and confirm
        await tripDetail.deleteTripButton.click();
        await expect(
          page.getByText("Are you sure you want to delete this trip?"),
        ).toBeVisible();
        await page.getByRole("button", { name: "Yes, delete" }).click();
      });

      await test.step("trip removed from dashboard", async () => {
        await page.waitForURL("**/dashboard", { timeout: 20000 });
        await expect(page.getByText(updatedName)).not.toBeVisible();

        const emptyState = dashboard.emptyStateHeading;
        const upcomingSection = dashboard.upcomingTripsHeading;
        await expect(emptyState.or(upcomingSection).first()).toBeVisible();
      });
    },
  );

  test(
    "trip permissions journey",
    async ({ page, request }) => {
      const dashboard = new DashboardPage(page);
      const tripDetail = new TripDetailPage(page);
      const timestamp = Date.now();
      const shortTimestamp = timestamp.toString().slice(-10);
      const userAPhone = `+1555${shortTimestamp}`;
      const userBPhone = `+1555${(parseInt(shortTimestamp) + 1000).toString()}`;

      await test.step("User A creates a trip", async () => {
        await authenticateViaAPIWithPhone(
          page,
          request,
          userAPhone,
          "User A - Trip Creator",
        );
        await expect(dashboard.heading).toBeVisible();
      });

      const tripName = `Permission Trip ${timestamp}`;
      const tripDestination = "Barcelona, Spain";
      let tripId: string;

      await test.step("create trip with dates", async () => {
        await dashboard.createTripButton.click();
        await expect(tripDetail.createDialogHeading).toBeVisible();

        await tripDetail.nameInput.fill(tripName);
        await tripDetail.destinationInput.fill(tripDestination);
        await tripDetail.startDateInput.fill("2026-09-15");
        await tripDetail.endDateInput.fill("2026-09-20");
        await tripDetail.continueButton.click();
        await expect(tripDetail.step2Indicator).toBeVisible();
        await tripDetail.createTripButton.click();

        await page.waitForURL("**/trips/**");
        tripId = page.url().split("/trips/")[1];
        await expect(
          page.getByRole("heading", { level: 1, name: tripName }),
        ).toBeVisible();
        await expect(tripDetail.editButton).toBeVisible();
        await expect(page.getByText("Organizing")).toBeVisible();
      });

      await test.step("non-member cannot access trip", async () => {
        await page.context().clearCookies();
        await authenticateViaAPIWithPhone(
          page,
          request,
          userBPhone,
          "User B - Non-Member",
        );

        await page.goto(`/trips/${tripId}`);
        await expect(
          page.getByRole("heading", { name: "Trip not found" }),
        ).toBeVisible();
        await expect(
          page.getByText(
            /This trip doesn't exist or you don't have access to it/i,
          ),
        ).toBeVisible();
        await expect(tripDetail.editButton).not.toBeVisible();

        const returnLink = page.getByRole("link", {
          name: "Return to dashboard",
        });
        await expect(returnLink).toBeVisible();
        await returnLink.click();
        await page.waitForURL("**/dashboard");
        await expect(dashboard.heading).toBeVisible();
        await expect(page.getByText(tripName)).not.toBeVisible();
      });

      await test.step("add User B as co-organizer", async () => {
        await page.context().clearCookies();
        await authenticateViaAPIWithPhone(
          page,
          request,
          userAPhone,
          "User A - Trip Creator",
        );

        await page.goto(`/trips/${tripId}`);
        await expect(
          page.getByRole("heading", { level: 1, name: tripName }),
        ).toBeVisible();

        const addCoOrgResponse = await page.request.post(
          `http://localhost:8000/api/trips/${tripId}/co-organizers`,
          { data: { phoneNumber: userBPhone } },
        );
        expect(addCoOrgResponse.ok()).toBeTruthy();
      });

      await test.step("co-organizer can view and edit trip", async () => {
        await page.context().clearCookies();
        await authenticateViaAPIWithPhone(
          page,
          request,
          userBPhone,
          "User B - Co-Organizer",
        );

        await page.goto(`/trips/${tripId}`);
        await expect(
          page.getByRole("heading", { level: 1, name: tripName }),
        ).toBeVisible();
        await expect(tripDetail.editButton).toBeVisible();
        await expect(page.getByText("Organizing")).toBeVisible();

        const updatedTripName = `${tripName} - Updated by Co-Org`;
        await tripDetail.editButton.click();
        await expect(tripDetail.editDialogHeading).toBeVisible();
        await tripDetail.nameInput.fill(updatedTripName);
        await tripDetail.continueButton.click();
        await tripDetail.updateTripButton.click();

        await expect(
          page.getByRole("heading", { level: 1, name: updatedTripName }),
        ).toBeVisible({ timeout: 10000 });
        await expect(
          page.getByText("Trip updated successfully"),
        ).toBeVisible();
      });

      await test.step("remove co-organizer and verify access revoked", async () => {
        await page.context().clearCookies();
        await authenticateViaAPIWithPhone(
          page,
          request,
          userAPhone,
          "User A - Trip Creator",
        );

        const tripResponse = await page.request.get(
          `http://localhost:8000/api/trips/${tripId}`,
        );
        expect(tripResponse.ok()).toBeTruthy();

        const tripData = await tripResponse.json();
        const userBId = tripData.trip.organizers.find(
          (org: { phoneNumber: string }) => org.phoneNumber === userBPhone,
        )?.id;
        expect(userBId).toBeDefined();

        const removeCoOrgResponse = await page.request.delete(
          `http://localhost:8000/api/trips/${tripId}/co-organizers/${userBId}`,
        );
        expect(removeCoOrgResponse.ok()).toBeTruthy();

        await page.context().clearCookies();
        await authenticateViaAPIWithPhone(
          page,
          request,
          userBPhone,
          "User B - Co-Organizer",
        );

        await page.goto(`/trips/${tripId}`);
        await expect(
          page.getByRole("heading", { name: "Trip not found" }),
        ).toBeVisible();
        await expect(tripDetail.editButton).not.toBeVisible();
        await expect(page.getByText("Organizing")).not.toBeVisible();
      });
    },
  );

  test("trip form validation", async ({ page, request }) => {
    const dashboard = new DashboardPage(page);
    const tripDetail = new TripDetailPage(page);
    await authenticateViaAPI(page, request, "Validation User");

    await test.step("empty submission shows validation errors", async () => {
      await dashboard.createTripButton.click();
      await expect(tripDetail.createDialogHeading).toBeVisible();
      await tripDetail.continueButton.click();

      await expect(tripDetail.step1Indicator).toBeVisible();
      await expect(
        page.getByText(/trip name must be at least 3 characters/i),
      ).toBeVisible();
      await expect(
        page.getByText(/destination is required/i),
      ).toBeVisible();

      // Close dialog
      await page.keyboard.press("Escape");
    });

    await test.step("back/forward navigation preserves data", async () => {
      await dashboard.createTripButton.click();
      await expect(tripDetail.createDialogHeading).toBeVisible();

      const tripName = `Navigation Test ${Date.now()}`;
      await tripDetail.nameInput.fill(tripName);
      await tripDetail.destinationInput.fill("London, UK");
      await tripDetail.continueButton.click();
      await expect(tripDetail.step2Indicator).toBeVisible();

      await tripDetail.backButton.click();
      await expect(tripDetail.step1Indicator).toBeVisible();
      await expect(tripDetail.nameInput).toHaveValue(tripName);
      await expect(tripDetail.destinationInput).toHaveValue("London, UK");

      // Close dialog
      await page.keyboard.press("Escape");
    });

    await test.step("create trip with minimal fields", async () => {
      await dashboard.createTripButton.click();
      await expect(tripDetail.createDialogHeading).toBeVisible();

      const tripName = `Minimal Trip ${Date.now()}`;
      await tripDetail.nameInput.fill(tripName);
      await tripDetail.destinationInput.fill("Paris, France");
      await tripDetail.continueButton.click();
      await expect(tripDetail.step2Indicator).toBeVisible();
      await tripDetail.createTripButton.click();

      await page.waitForURL("**/trips/**");
      await expect(
        page.getByRole("heading", { level: 1, name: tripName }),
      ).toBeVisible();
      await expect(page.getByText("Paris, France")).toBeVisible();
      await expect(page.getByText("Dates TBD")).toBeVisible();
    });

    await test.step("empty state shows create button", async () => {
      // New user with no trips
      await page.context().clearCookies();
      await authenticateViaAPI(page, request, "Empty State User");

      await expect(dashboard.emptyStateHeading).toBeVisible();
      await expect(
        page.getByText("Start planning your next adventure"),
      ).toBeVisible();
      await expect(dashboard.emptyStateCreateButton).toBeVisible();

      await dashboard.emptyStateCreateButton.click();
      await expect(tripDetail.createDialogHeading).toBeVisible();
    });

    await test.step("edit validation prevents invalid updates", async () => {
      // Close dialog and create a trip to edit
      await page.keyboard.press("Escape");

      await dashboard.createTripButton.click();
      await expect(tripDetail.createDialogHeading).toBeVisible();

      const tripName = `Validation Trip ${Date.now()}`;
      await tripDetail.nameInput.fill(tripName);
      await tripDetail.destinationInput.fill("Chicago, IL");
      await tripDetail.continueButton.click();
      await tripDetail.createTripButton.click();
      await page.waitForURL("**/trips/**");

      await tripDetail.editButton.click();
      await expect(tripDetail.editDialogHeading).toBeVisible();

      await tripDetail.nameInput.fill("AB"); // Too short
      await tripDetail.destinationInput.fill(""); // Required field
      await tripDetail.continueButton.click();

      await expect(tripDetail.step1Indicator).toBeVisible();
      await expect(
        page.getByText(/trip name must be at least 3 characters/i),
      ).toBeVisible();
      await expect(
        page.getByText(/destination is required/i),
      ).toBeVisible();
      await expect(tripDetail.step2Indicator).not.toBeVisible();
    });
  });
});
