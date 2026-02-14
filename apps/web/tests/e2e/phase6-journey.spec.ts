import { test, expect } from "@playwright/test";
import {
  authenticateViaAPI,
  authenticateViaAPIWithPhone,
  createUserViaAPI,
} from "./helpers/auth";
import { snap } from "./helpers/screenshots";
import { removeNextjsDevOverlay } from "./helpers/nextjs-dev";
import { pickDate } from "./helpers/date-pickers";
import { createTripViaAPI, inviteAndAcceptViaAPI } from "./helpers/invitations";
import { TripDetailPage, TripsPage } from "./helpers/pages";

const API_BASE = "http://localhost:8000/api";

/**
 * E2E Journey: Phase 6 Advanced Itinerary Features
 *
 * Tests the five Phase 6 features:
 * 1. Deleted Items & Restore
 * 2. Auto-Lock Past Trips
 * 3. Remove Member
 * 4. Meetup Location/Time on events
 * 5. Multi-Day Event Badge
 *
 * Uses authenticateViaAPI for fast auth (no browser navigation).
 */

/** Helper: create a trip via the UI and land on the trip detail page. */
async function createTrip(
  page: import("@playwright/test").Page,
  tripName: string,
  destination: string,
  startDate: string,
  endDate: string,
) {
  const tripDetail = new TripDetailPage(page);
  const trips = new TripsPage(page);
  await trips.createTripButton.click();
  await expect(tripDetail.createDialogHeading).toBeVisible();
  await tripDetail.nameInput.fill(tripName);
  await tripDetail.destinationInput.fill(destination);
  await pickDate(page, tripDetail.startDateButton, startDate);
  await pickDate(page, tripDetail.endDateButton, endDate);
  await tripDetail.continueButton.click();
  await expect(tripDetail.step2Indicator).toBeVisible();
  await tripDetail.createTripButton.click();
  await page.waitForURL("**/trips/**");
  await expect(
    page.getByRole("heading", { level: 1, name: tripName }),
  ).toBeVisible();
}

test.describe("Phase 6: Advanced Itinerary Features", () => {
  test.beforeEach(async ({ page }) => {
    await removeNextjsDevOverlay(page);
    await page.context().clearCookies();
  });

  test("deleted items and restore", async ({ page, request }) => {
    await authenticateViaAPI(page, request, "Delete Restore User");
    const tripName = `Delete Restore Trip ${Date.now()}`;
    let tripId: string;
    let eventId: string;

    await test.step("create trip via UI", async () => {
      await createTrip(
        page,
        tripName,
        "Portland, OR",
        "2026-10-01",
        "2026-10-05",
      );
      tripId = page.url().split("/trips/")[1];
      expect(tripId).toBeTruthy();
    });

    await test.step("create event via API", async () => {
      const response = await page.request.post(
        `${API_BASE}/trips/${tripId}/events`,
        {
          data: {
            name: "Dinner at Joe's",
            eventType: "meal",
            startTime: "2026-10-01T18:00:00.000Z",
          },
        },
      );
      expect(response.ok()).toBeTruthy();
      const event = await response.json();
      eventId = event.id;
      expect(eventId).toBeTruthy();
    });

    await test.step("reload and verify event is visible", async () => {
      await page.reload();
      await expect(page.getByText("Dinner at Joe's")).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step("expand event card and delete via edit dialog", async () => {
      // Click on the event card to expand it
      const card = page
        .locator('[role="button"][aria-expanded]')
        .filter({ hasText: /Dinner at Joe's/ })
        .first();
      const expanded = await card.getAttribute("aria-expanded");
      if (expanded !== "true") {
        await card.click();
      }

      // Click the Edit button, then Delete event in the edit dialog
      await expect(
        page.locator('button[title="Edit event"]').first(),
      ).toBeVisible({ timeout: 5000 });
      await page.locator('button[title="Edit event"]').first().click();
      await expect(
        page.getByRole("heading", { name: "Edit event" }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Delete event" }).click();
      await expect(page.getByText("Are you sure?")).toBeVisible();
      await page.getByRole("button", { name: "Yes, delete" }).click();
    });

    await test.step("verify event deleted and toast shown", async () => {
      await expect(page.getByText("Event deleted")).toBeVisible({
        timeout: 10000,
      });
      // Event should no longer be in the main itinerary cards
      // (may still exist in deleted items section below)
    });

    await test.step("find and expand Deleted Items section", async () => {
      // Scroll down and look for the Deleted Items section
      await expect(page.getByText(/Deleted Items \(\d+\)/)).toBeVisible({
        timeout: 10000,
      });

      // Click the toggle button to expand the deleted items section
      const toggleButton = page
        .locator("button[aria-expanded]")
        .filter({ hasText: /Deleted Items/ });
      const isExpanded = await toggleButton.getAttribute("aria-expanded");
      if (isExpanded !== "true") {
        await toggleButton.click();
      }

      // Verify the deleted event appears in the list
      await expect(
        page.locator(".border-t").filter({ hasText: /Dinner at Joe's/ }),
      ).toBeVisible();
      await snap(page, "20-deleted-items-section");
    });

    await test.step("restore the event", async () => {
      // Click the Restore button next to the event
      const restoreButton = page
        .getByRole("button", { name: "Restore" })
        .first();
      await restoreButton.click();

      // Verify restore success toast
      await expect(page.getByText("Event restored")).toBeVisible({
        timeout: 10000,
      });
    });

    await test.step("verify event reappears in the itinerary", async () => {
      // The event should be back in the main itinerary
      await expect(page.getByText("Dinner at Joe's")).toBeVisible({
        timeout: 10000,
      });

      // Deleted Items section should now be hidden (no more deleted items)
      await expect(page.getByText(/Deleted Items/)).not.toBeVisible();

      await snap(page, "21-event-restored");
    });
  });

  test("auto-lock past trips", async ({ page, request }) => {
    const timestamp = Date.now();
    const shortTimestamp = timestamp.toString().slice(-10);
    const organizerPhone = `+1555${shortTimestamp}`;

    let tripId: string;

    await test.step("create user and past trip via API", async () => {
      const organizerCookie = await createUserViaAPI(
        request,
        organizerPhone,
        "Past Trip Organizer",
      );

      tripId = await createTripViaAPI(request, organizerCookie, {
        name: `Past Trip ${timestamp}`,
        destination: "Historic City",
        startDate: "2025-01-01",
        endDate: "2025-01-05",
      });
      expect(tripId).toBeTruthy();
    });

    await test.step("authenticate and navigate to past trip", async () => {
      await authenticateViaAPIWithPhone(
        page,
        request,
        organizerPhone,
        "Past Trip Organizer",
      );

      await page.goto(`/trips/${tripId}`);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: `Past Trip ${timestamp}`,
        }),
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("verify read-only banner is visible", async () => {
      await expect(
        page.getByText("This trip has ended. The itinerary is read-only."),
      ).toBeVisible({ timeout: 10000 });
      await snap(page, "22-past-trip-read-only-banner");
    });

    await test.step("verify FAB is not visible", async () => {
      await expect(
        page.getByRole("button", { name: "Add to itinerary" }),
      ).not.toBeVisible();
    });

    await test.step("verify empty state has no add buttons", async () => {
      // The empty state should show the lock message but not add buttons
      await expect(
        page.getByRole("button", { name: "Add Event" }),
      ).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "Add Accommodation" }),
      ).not.toBeVisible();
    });

    await test.step("API rejects event creation for locked trip", async () => {
      const response = await page.request.post(
        `${API_BASE}/trips/${tripId}/events`,
        {
          data: {
            name: "Should Fail",
            eventType: "activity",
            startTime: "2025-01-02T10:00:00.000Z",
          },
        },
      );
      // Expect the API to reject with 403 (forbidden) for locked trips
      expect(response.status()).toBe(403);
    });
  });

  test("remove member from trip", async ({ page, request }) => {
    test.slow(); // Multiple auth cycles

    const timestamp = Date.now();
    const shortTimestamp = timestamp.toString().slice(-10);
    const organizerPhone = `+1555${shortTimestamp}`;
    const memberPhone = `+1555${(parseInt(shortTimestamp) + 1000).toString()}`;

    let tripId: string;

    await test.step("setup: create organizer, trip, invite member, and member creates event", async () => {
      const organizerCookie = await createUserViaAPI(
        request,
        organizerPhone,
        "Remove Test Org",
      );

      tripId = await createTripViaAPI(request, organizerCookie, {
        name: `Remove Member Trip ${timestamp}`,
        destination: "Austin, TX",
        startDate: "2026-10-01",
        endDate: "2026-10-05",
      });

      await inviteAndAcceptViaAPI(
        request,
        tripId,
        organizerPhone,
        memberPhone,
        "Test Member",
      );

      // Member creates an event so we can verify "Member no longer attending" after removal
      const memberCookie = await createUserViaAPI(
        request,
        memberPhone,
        "Test Member",
      );
      const eventResponse = await request.post(
        `${API_BASE}/trips/${tripId}/events`,
        {
          data: {
            name: "Member's Dinner Plan",
            eventType: "meal",
            startTime: "2026-10-02T19:00:00.000Z",
          },
          headers: { cookie: memberCookie },
        },
      );
      if (!eventResponse.ok()) {
        throw new Error(
          `Failed to create member event: ${eventResponse.status()} ${await eventResponse.text()}`,
        );
      }
    });

    await test.step("organizer navigates to trip and verifies member's event", async () => {
      await authenticateViaAPIWithPhone(
        page,
        request,
        organizerPhone,
        "Remove Test Org",
      );

      await page.goto(`/trips/${tripId}`);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: `Remove Member Trip ${timestamp}`,
        }),
      ).toBeVisible({ timeout: 15000 });

      // Verify the member's event is visible before removal
      await expect(page.getByText("Member's Dinner Plan")).toBeVisible({
        timeout: 10000,
      });
    });

    await test.step("verify 2 members and open members dialog", async () => {
      await expect(page.getByText(/2 members?/)).toBeVisible();
      await page.getByText(/2 members?/).click();

      // Wait for Members dialog
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: "Members" }),
      ).toBeVisible();

      // Verify both members are listed
      await expect(dialog.getByText("Remove Test Org")).toBeVisible();
      await expect(dialog.getByText("Test Member")).toBeVisible();
      await snap(page, "23-members-dialog-before-remove");
    });

    await test.step("click remove button for member", async () => {
      // The remove button has aria-label "Remove {displayName}"
      await page.getByRole("button", { name: /Remove Test Member/ }).click();

      // Verify confirmation dialog appears
      await expect(
        page.getByRole("heading", { name: "Remove member" }),
      ).toBeVisible();
      await expect(
        page.getByText(/Are you sure you want to remove/),
      ).toBeVisible();
      await expect(
        page.getByText("Test Member", { exact: false }),
      ).toBeVisible();
    });

    await test.step("confirm removal", async () => {
      // Click the "Remove" button in the confirmation dialog
      await page.getByRole("button", { name: "Remove", exact: true }).click();

      // Verify success toast
      await expect(page.getByText(/Test Member has been removed/)).toBeVisible({
        timeout: 10000,
      });
      await snap(page, "24-member-removed");
    });

    await test.step("verify member count updated", async () => {
      // The members dialog should now show only the organizer
      // After removal, the dialog goes back to the members list
      await expect(page.getByText("Test Member")).not.toBeVisible({
        timeout: 10000,
      });

      // Close dialog
      await page.keyboard.press("Escape");

      // Verify member count dropped to 1
      await expect(page.getByText(/1 member(?!s)/)).toBeVisible({
        timeout: 10000,
      });
    });

    await test.step("verify member's event shows 'no longer attending' badge", async () => {
      // The member's event should still be in the itinerary
      await expect(page.getByText("Member's Dinner Plan")).toBeVisible({
        timeout: 10000,
      });

      // The event card should now show "Member no longer attending" badge
      // since the creator's member record was deleted
      await expect(
        page.getByText("Member no longer attending"),
      ).toBeVisible({ timeout: 10000 });

      await snap(page, "25-member-no-longer-attending");
    });
  });

  test("meetup location and time on event card", async ({ page, request }) => {
    await authenticateViaAPI(page, request, "Meetup Fields User");
    const tripName = `Meetup Trip ${Date.now()}`;
    let tripId: string;

    await test.step("create trip via UI", async () => {
      await createTrip(
        page,
        tripName,
        "San Francisco, CA",
        "2026-10-01",
        "2026-10-05",
      );
      tripId = page.url().split("/trips/")[1];
      expect(tripId).toBeTruthy();
    });

    await test.step("create event with meetup fields via API", async () => {
      const response = await page.request.post(
        `${API_BASE}/trips/${tripId}/events`,
        {
          data: {
            name: "Museum Visit",
            eventType: "activity",
            startTime: "2026-10-02T10:00:00.000Z",
            meetupLocation: "Hotel Lobby",
            meetupTime: "2026-10-02T09:30:00.000Z",
          },
        },
      );
      expect(response.ok()).toBeTruthy();
    });

    await test.step("reload and verify event appears", async () => {
      await page.reload();
      await expect(page.getByText("Museum Visit")).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step("expand event card and verify meetup info", async () => {
      // Click on the event card to expand it
      const card = page
        .locator('[role="button"][aria-expanded]')
        .filter({ hasText: /Museum Visit/ })
        .first();
      const expanded = await card.getAttribute("aria-expanded");
      if (expanded !== "true") {
        await card.click();
      }

      // Verify meetup info is displayed in expanded view
      // The format is "Meet at {location} at {time}"
      // The meetupTime "2026-10-02T09:30:00.000Z" in America/Chicago (CDT, UTC-5) = 4:30 AM
      // However the trip timezone is UTC (set by createTripViaAPI default),
      // so the displayed time depends on the selected timezone.
      // The itinerary defaults to the trip timezone which is UTC.
      // In UTC, 09:30 UTC = "9:30 AM"
      await expect(page.getByText(/Meet at Hotel Lobby at/)).toBeVisible({
        timeout: 5000,
      });

      await snap(page, "26-meetup-fields-expanded");
    });
  });

  test("multi-day event badge", async ({ page, request }) => {
    await authenticateViaAPI(page, request, "Multi Day User");
    const tripName = `Multi Day Trip ${Date.now()}`;
    let tripId: string;

    await test.step("create trip via UI", async () => {
      await createTrip(
        page,
        tripName,
        "Nashville, TN",
        "2026-10-01",
        "2026-10-10",
      );
      tripId = page.url().split("/trips/")[1];
      expect(tripId).toBeTruthy();
    });

    await test.step("create multi-day event via API", async () => {
      const response = await page.request.post(
        `${API_BASE}/trips/${tripId}/events`,
        {
          data: {
            name: "Music Festival",
            eventType: "activity",
            startTime: "2026-10-03T10:00:00.000Z",
            endTime: "2026-10-05T22:00:00.000Z",
          },
        },
      );
      expect(response.ok()).toBeTruthy();
    });

    await test.step("reload and verify event appears", async () => {
      await page.reload();
      await expect(page.getByText("Music Festival")).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step("verify multi-day date range badge", async () => {
      // The badge shows formatted short dates using formatInTimezone with "short-date".
      // Trip timezone defaults to UTC from createTripViaAPI.
      // In UTC: 2026-10-03T10:00:00.000Z => Oct 3, 2026-10-05T22:00:00.000Z => Oct 5
      // Badge text: "Oct 3\u2013Oct 5" (en-dash)
      await expect(page.getByText(/Oct 3.*Oct 5/)).toBeVisible({
        timeout: 5000,
      });

      await snap(page, "27-multi-day-badge");
    });

    await test.step("verify badge also visible in group-by-type view", async () => {
      // Switch to group-by-type view
      await page.getByRole("button", { name: "Group by Type" }).click();

      // Badge should still be visible
      await expect(page.getByText(/Oct 3.*Oct 5/)).toBeVisible({
        timeout: 5000,
      });

      await snap(page, "28-multi-day-badge-group-view");

      // Switch back to day-by-day
      await page.getByRole("button", { name: "Day by Day" }).click();
    });
  });
});
