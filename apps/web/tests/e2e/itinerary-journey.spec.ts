import { test, expect } from "@playwright/test";
import { authenticateViaAPI } from "./helpers/auth";
import { TripsPage, TripDetailPage } from "./helpers/pages";
import { snap } from "./helpers/screenshots";
import { removeNextjsDevOverlay } from "./helpers/nextjs-dev";
import { pickDate, pickDateTime } from "./helpers/date-pickers";
import { createTrip } from "./helpers/trips";

/**
 * E2E Journey: Itinerary CRUD, View Modes, and Permissions
 *
 * Consolidates 12 individual itinerary tests into 3 journey tests.
 * Uses authenticateViaAPI for fast auth.
 */

/** Helper: open the FAB dropdown and click a menu item, or fall back to empty-state button. */
async function clickFabAction(
  page: import("@playwright/test").Page,
  actionName: string,
) {
  // Wait for any Sonner toast to disappear so it doesn't intercept the click
  const toast = page.locator("[data-sonner-toast]").first();
  if (await toast.isVisible().catch(() => false)) {
    await toast.waitFor({ state: "hidden", timeout: 10000 });
  }

  const fab = page.getByRole("button", { name: "Add to itinerary" });
  if (await fab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await fab.click();
    await page.getByRole("menuitem", { name: actionName }).click();
  } else {
    // Empty state has direct buttons like "Add Event", "Add Accommodation"
    await page.getByRole("button", { name: `Add ${actionName}` }).click();
  }
}

/** Helper: create an event via the UI (assumes on trip detail page). */
async function createEvent(
  page: import("@playwright/test").Page,
  name: string,
  startDateTime: string,
  options?: {
    type?: string;
    location?: string;
    description?: string;
    endDateTime?: string;
  },
) {
  await clickFabAction(page, "Event");
  await expect(
    page.getByRole("heading", { name: "Create a new event" }),
  ).toBeVisible();

  await page.getByLabel(/event name/i).fill(name);

  if (options?.description) {
    await page.getByLabel(/description/i).fill(options.description);
  }

  if (options?.type) {
    const dialog = page.getByRole("dialog");
    await dialog.locator('button[role="combobox"]').first().click();
    await page
      .locator(`div[role="option"]`)
      .filter({ hasText: options.type })
      .click();
  }

  if (options?.location) {
    await page.locator('input[name="location"]').fill(options.location);
  }

  const startTrigger = page.getByRole("button", { name: "Start time" });
  await pickDateTime(page, startTrigger, startDateTime);

  if (options?.endDateTime) {
    const endTrigger = page.getByRole("button", { name: "End time" });
    await pickDateTime(page, endTrigger, options.endDateTime);
  }

  await page.getByRole("button", { name: "Create event" }).click();
}

test.describe("Itinerary Journey", () => {
  test.beforeEach(async ({ page }) => {
    await removeNextjsDevOverlay(page);
    await page.context().clearCookies();
  });

  test(
    "itinerary CRUD journey",
    { tag: "@smoke" },
    async ({ page, request }) => {
      await authenticateViaAPI(page, request, "Itinerary Tester");
      const tripName = `Itinerary Trip ${Date.now()}`;

      await test.step("create trip", async () => {
        await createTrip(
          page,
          tripName,
          "San Diego, CA",
          "2026-10-01",
          "2026-10-03",
        );
      });

      await test.step("create meal event", async () => {
        const eventName = `Dinner at Harbor ${Date.now()}`;
        await createEvent(page, eventName, "2026-10-01T18:30", {
          type: "Meal",
          location: "Harbor Drive Seafood",
          description: "Seafood restaurant by the bay",
          endDateTime: "2026-10-01T20:00",
        });

        await expect(page.getByText(/Dinner at Harbor/)).toBeVisible();
        await expect(page.getByText(/6:30 PM/)).toBeVisible();

        // Location should be a Google Maps link
        const locationLink = page.getByRole("link", {
          name: "Harbor Drive Seafood",
        });
        await expect(locationLink).toBeVisible();
        await expect(locationLink).toHaveAttribute(
          "href",
          /google\.com\/maps\/search/,
        );
      });

      await test.step("create accommodation", async () => {
        await clickFabAction(page, "Accommodation");
        await expect(
          page.getByRole("heading", { name: "Create a new accommodation" }),
        ).toBeVisible();

        const accommodationName = `Downtown Hotel ${Date.now()}`;
        await page.locator('input[name="name"]').fill(accommodationName);
        await page
          .locator('input[name="address"]')
          .fill("123 Main St, San Diego");
        await page
          .locator('textarea[name="description"]')
          .fill("Modern hotel in the heart of downtown");
        await pickDateTime(
          page,
          page.getByRole("button", { name: "Check-in" }),
          "2026-10-01T15:00",
        );
        await pickDateTime(
          page,
          page.getByRole("button", { name: "Check-out" }),
          "2026-10-03T11:00",
        );

        const linkInput = page.locator('input[aria-label="Link URL"]');
        await linkInput.fill("https://example.com/hotel");
        await page.getByRole("button", { name: "Add link" }).click();

        await page
          .getByRole("button", { name: "Create accommodation" })
          .click();

        // Address should be a Google Maps link
        const addressLink = page.getByRole("link", {
          name: "123 Main St, San Diego",
        });
        await expect(addressLink).toBeVisible();
        await expect(addressLink).toHaveAttribute(
          "href",
          /google\.com\/maps\/search/,
        );
      });

      await snap(page, "09-itinerary-with-events");

      await test.step("add member travel", async () => {
        await clickFabAction(page, "My Travel");
        await expect(
          page.getByRole("heading", { name: "Add your travel details" }),
        ).toBeVisible();

        await page.getByRole("radio", { name: "Arrival" }).click();

        const travelTimeTrigger = page.getByRole("button", {
          name: "Travel time",
        });
        await pickDateTime(page, travelTimeTrigger, "2026-10-01T14:30");

        await page.locator('input[name="location"]').fill("San Diego Airport");
        await page
          .locator('textarea[name="details"]')
          .fill("Arriving from Chicago");
        await page.getByRole("button", { name: "Add travel details" }).click();

        // Travel card shows member name
        await expect(
          page.getByText(/Itinerary Tester/).first(),
        ).toBeVisible();

        // Location should be a Google Maps link
        const travelLocationLink = page.getByRole("link", {
          name: "San Diego Airport",
        });
        await expect(travelLocationLink).toBeVisible();
        await expect(travelLocationLink).toHaveAttribute(
          "href",
          /google\.com\/maps\/search/,
        );

        // Expand travel card to see details
        await page.getByText(/Itinerary Tester/).first().click();
        await expect(page.getByText("Arriving from Chicago")).toBeVisible();
      });

      await test.step("edit event", async () => {
        await page
          .getByText(/Dinner at Harbor/)
          .first()
          .click();
        await page.locator('button[title="Edit event"]').first().click();
        await expect(
          page.getByRole("heading", { name: "Edit event" }),
        ).toBeVisible();

        const updatedEventName = `Updated Dinner ${Date.now()}`;
        const nameInput = page.locator('input[name="name"]');
        await nameInput.clear();
        await nameInput.fill(updatedEventName);
        await page.locator('input[name="location"]').fill("Gaslamp Quarter");
        await page.getByRole("button", { name: "Update event" }).click();

        // Wait for edit dialog to close
        await expect(
          page.getByRole("heading", { name: "Edit event" }),
        ).not.toBeVisible();

        await expect(page.getByText(/Updated Dinner/)).toBeVisible();
        // Updated location should also be a Google Maps link
        const updatedLocationLink = page.getByRole("link", {
          name: "Gaslamp Quarter",
        });
        await expect(updatedLocationLink).toBeVisible();
        await expect(updatedLocationLink).toHaveAttribute(
          "href",
          /google\.com\/maps\/search/,
        );
        await expect(page.getByText(/Dinner at Harbor/)).not.toBeVisible();
      });

      await test.step("delete event with cancel then confirm", async () => {
        // Find the event card — it may still be expanded from the edit step
        const card = page
          .locator('[role="button"][aria-expanded]')
          .filter({ hasText: /Updated Dinner/ })
          .first();
        const expanded = await card.getAttribute("aria-expanded");
        if (expanded !== "true") {
          await card.click();
        }
        await expect(
          page.locator('button[title="Edit event"]').first(),
        ).toBeVisible({ timeout: 5000 });
        await page.locator('button[title="Edit event"]').first().click();
        await expect(
          page.getByRole("heading", { name: "Edit event" }),
        ).toBeVisible();

        await page.getByRole("button", { name: "Delete event" }).click();
        await expect(page.getByText("Are you sure?")).toBeVisible();

        // Cancel first
        await page.getByRole("button", { name: "Cancel" }).last().click();
        await expect(
          page.getByRole("heading", { name: "Edit event" }),
        ).toBeVisible();

        // Delete for real
        await page.getByRole("button", { name: "Delete event" }).click();
        await expect(page.getByText("Are you sure?")).toBeVisible();
        await page.getByRole("button", { name: "Yes, delete" }).click();

        await expect(page.getByText(/Updated Dinner/)).not.toBeVisible();
      });
    },
  );

  test("itinerary view modes", async ({ page, request }) => {
    await authenticateViaAPI(page, request, "View Mode User");
    const tripName = `View Mode Trip ${Date.now()}`;

    await test.step("create trip with multiple events", async () => {
      await createTrip(
        page,
        tripName,
        "Las Vegas, NV",
        "2027-03-10",
        "2027-03-13",
      );

      const mealEvent = `Lunch ${Date.now()}`;
      await createEvent(page, mealEvent, "2027-03-10T12:00", { type: "Meal" });
      await expect(page.getByText(/Lunch/)).toBeVisible();

      const activityEvent = `Show ${Date.now()}`;
      await createEvent(page, activityEvent, "2027-03-10T20:00", {
        type: "Activity",
      });
      await expect(page.getByText(/Show/)).toBeVisible();
    });

    await test.step("add member travel (arrival)", async () => {
      await clickFabAction(page, "My Travel");
      await expect(
        page.getByRole("heading", { name: "Add your travel details" }),
      ).toBeVisible();

      await page.getByRole("radio", { name: "Arrival" }).click();

      const travelTimeTrigger = page.getByRole("button", {
        name: "Travel time",
      });
      await pickDateTime(page, travelTimeTrigger, "2027-03-10T09:00");

      await page.locator('input[name="location"]').fill("Las Vegas Airport");
      await page.getByRole("button", { name: "Add travel details" }).click();

      // Travel card shows member name
      await expect(page.getByText(/View Mode User/).first()).toBeVisible();

      // Location is a Google Maps link
      const airportLink = page.getByRole("link", { name: "Las Vegas Airport" });
      await expect(airportLink).toBeVisible();
      await expect(airportLink).toHaveAttribute(
        "href",
        /google\.com\/maps\/search/,
      );
    });

    await test.step("verify date gutter in day-by-day view", async () => {
      // The calendar-style date gutter should show month, day number, and weekday
      // Trip dates: 2027-03-10 to 2027-03-13
      await expect(page.getByText("Mar").first()).toBeVisible();
      await expect(page.getByText("10").first()).toBeVisible();
      await expect(page.getByText("Wed").first()).toBeVisible();
    });

    await snap(page, "10-itinerary-day-by-day");

    await test.step("toggle day-by-day to group-by-type", async () => {
      const dayByDayButton = page
        .getByRole("button", { name: "Day by Day" })
        .first();
      await expect(dayByDayButton).toBeVisible();

      await page.getByRole("button", { name: "Group by Type" }).click();

      // Section icons have title tooltips
      await expect(page.locator('[title="Meals"]')).toBeVisible();
      await expect(page.locator('[title="Activities"]')).toBeVisible();
      await expect(page.locator('[title="Arrivals"]')).toBeVisible();
      await expect(page.getByText(/Lunch/)).toBeVisible();
      await expect(page.getByText(/Show/)).toBeVisible();
      // Location is still a Google Maps link in group-by-type view
      const airportLinkGrouped = page.getByRole("link", {
        name: "Las Vegas Airport",
      });
      await expect(airportLinkGrouped).toBeVisible();
      // Verify date labels appear on cards in group-by-type view
      await expect(page.getByText(/Mar 10, 2027/).first()).toBeVisible();
      await snap(page, "11-itinerary-group-by-type");
    });

    await test.step("toggle back to day-by-day", async () => {
      await page.getByRole("button", { name: "Day by Day" }).click();
      await expect(page.getByText(/Lunch/)).toBeVisible();
      await expect(page.getByText(/Show/)).toBeVisible();
    });

    await test.step("change timezone via dropdown", async () => {
      // Open timezone selector and pick user timezone
      const tzTrigger = page.getByRole("combobox", { name: "Timezone" });
      await expect(tzTrigger).toBeVisible();
      await expect(tzTrigger).toContainText("Trip");

      await tzTrigger.click();
      await page.getByRole("option", { name: /Current/ }).click();
      await expect(tzTrigger).toContainText("Current");
      await expect(page.getByText(/Lunch/)).toBeVisible();

      // Switch back to trip timezone
      await tzTrigger.click();
      await page.getByRole("option", { name: /Trip/ }).click();
      await expect(tzTrigger).toContainText("Trip");
    });

    await test.step("mobile viewport", async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      const header = page.getByTestId("itinerary-header");
      await expect(header).toBeVisible();

      await expect(
        page.getByRole("button", { name: "Day by Day" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Group by Type" }),
      ).toBeVisible();
      await expect(
        page.getByRole("combobox", { name: "Timezone" }),
      ).toBeVisible();
      await expect(page.getByText(/Lunch/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Add to itinerary" }),
      ).toBeVisible();

      // Dialog works on mobile via FAB
      await clickFabAction(page, "Event");
      await expect(
        page.getByRole("heading", { name: "Create a new event" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");

      // Restore desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await expect(page.getByText(/Lunch/)).toBeVisible();
    });
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
        `http://localhost:8000/api/trips/${tripId}/events`,
        {
          data: {
            name: "Dinner at Joe's",
            eventType: "meal",
            startTime: "2026-10-01T18:00:00.000Z",
          },
        },
      );
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      eventId = data.event.id;
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
    });

    await test.step("find and expand Deleted Items section", async () => {
      await expect(page.getByText(/Deleted Items \(\d+\)/)).toBeVisible({
        timeout: 10000,
      });

      const toggleButton = page
        .locator("button[aria-expanded]")
        .filter({ hasText: /Deleted Items/ });
      const isExpanded = await toggleButton.getAttribute("aria-expanded");
      if (isExpanded !== "true") {
        await toggleButton.click();
      }

      await expect(
        page.locator(".border-t").filter({ hasText: /Dinner at Joe's/ }),
      ).toBeVisible();
      await snap(page, "20-deleted-items-section");
    });

    await test.step("restore the event", async () => {
      const restoreButton = page
        .getByRole("button", { name: "Restore" })
        .first();
      await restoreButton.click();

      await expect(page.getByText("Event restored")).toBeVisible({
        timeout: 10000,
      });
    });

    await test.step("verify event reappears in the itinerary", async () => {
      await expect(page.getByText("Dinner at Joe's")).toBeVisible({
        timeout: 10000,
      });

      await expect(page.getByText(/Deleted Items/)).not.toBeVisible();

      await snap(page, "21-event-restored");
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
        `http://localhost:8000/api/trips/${tripId}/events`,
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
      const card = page
        .locator('[role="button"][aria-expanded]')
        .filter({ hasText: /Museum Visit/ })
        .first();
      const expanded = await card.getAttribute("aria-expanded");
      if (expanded !== "true") {
        await card.click();
      }

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
        `http://localhost:8000/api/trips/${tripId}/events`,
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
      await expect(page.getByText(/Oct 3.*Oct 5/)).toBeVisible({
        timeout: 5000,
      });

      await snap(page, "27-multi-day-badge");
    });

    await test.step("verify badge also visible in group-by-type view", async () => {
      await page.getByRole("button", { name: "Group by Type" }).click();

      await expect(page.getByText(/Oct 3.*Oct 5/)).toBeVisible({
        timeout: 5000,
      });

      await snap(page, "28-multi-day-badge-group-view");

      await page.getByRole("button", { name: "Day by Day" }).click();
    });
  });

  test("itinerary permissions and validation", async ({ page, request }) => {
    test.slow(); // 4 auth cycles — triple the timeout for CI
    const trips = new TripsPage(page);

    await test.step("organizer creates trip and verifies action buttons", async () => {
      await authenticateViaAPI(page, request, "Trip Owner A");

      const tripName = `Permission Trip ${Date.now()}`;
      await createTrip(
        page,
        tripName,
        "Atlanta, GA",
        "2026-10-25",
        "2026-10-27",
      );

      // Empty state shows direct action buttons for organizer
      await expect(
        page.getByRole("button", { name: "Add Event" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Add Accommodation" }),
      ).toBeVisible();
    });

    let tripId: string;

    await test.step("capture trip ID for later", async () => {
      tripId = page.url().split("/trips/")[1];
    });

    await test.step("non-member cannot access trip", async () => {
      await page.context().clearCookies();
      await authenticateViaAPI(page, request, "Non-Member B");

      await page.goto(`/trips/${tripId}`);
      await expect(
        page.getByRole("heading", { name: "Trip not found" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Add Event" }),
      ).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "Add Accommodation" }),
      ).not.toBeVisible();
    });

    await test.step("validation prevents empty event submission", async () => {
      await page.context().clearCookies();
      await authenticateViaAPI(page, request, "Validation Tester");

      const tripName = `Validation Trip ${Date.now()}`;
      await createTrip(page, tripName, "Miami, FL", "2026-11-01", "2026-11-03");

      await page.getByRole("button", { name: "Add Event" }).click();
      await expect(
        page.getByRole("heading", { name: "Create a new event" }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Create event" }).click();

      await expect(
        page.getByText("Event name must be at least 1 character"),
      ).toBeVisible();
      await expect(page.getByText("Invalid datetime")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Create a new event" }),
      ).toBeVisible();

      // Fix and submit
      await page.locator('input[name="name"]').fill("Valid Event");
      const startTimeTrigger = page.getByRole("button", { name: "Start time" });
      await pickDateTime(page, startTimeTrigger, "2026-11-01T10:00");
      await page.getByRole("button", { name: "Create event" }).click();

      await expect(page.getByText("Valid Event")).toBeVisible();
    });

    await test.step("organizer can add events when member creation disabled", async () => {
      await page.context().clearCookies();
      await authenticateViaAPI(page, request, "Trip Organizer RSVP");

      const tripName = `RSVP Trip ${Date.now()}`;
      const tripDetail = new TripDetailPage(page);

      await trips.createTripButton.click();
      await expect(tripDetail.createDialogHeading).toBeVisible({
        timeout: 10000,
      });
      await tripDetail.nameInput.fill(tripName);
      await tripDetail.destinationInput.fill("Chicago, IL");
      await pickDate(page, tripDetail.startDateButton, "2026-09-20");
      await pickDate(page, tripDetail.endDateButton, "2026-09-22");
      await tripDetail.continueButton.click();
      await expect(tripDetail.step2Indicator).toBeVisible();

      // Disable "Allow members to add events"
      const allowMembersCheckbox = page.locator(
        'button[role="checkbox"][aria-label="Allow members to add events"]',
      );
      await allowMembersCheckbox.click();

      await tripDetail.createTripButton.click();
      await page.waitForURL("**/trips/**");

      // Organizer can still add events (empty state shows Add Event button)
      await expect(
        page.getByRole("button", { name: "Add Event" }),
      ).toBeVisible();

      await createEvent(page, "Initial Event", "2026-09-20T10:00");
      await expect(page.getByText("Initial Event")).toBeVisible();

      // After adding content, FAB should be visible with Event option
      const fab = page.getByRole("button", { name: "Add to itinerary" });
      await expect(fab).toBeVisible();
      await fab.click();
      await expect(page.getByRole("menuitem", { name: "Event" })).toBeVisible();
      await page.keyboard.press("Escape");
    });
  });
});
