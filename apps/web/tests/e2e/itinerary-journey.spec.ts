import { test, expect } from "@playwright/test";
import { authenticateViaAPI, authenticateViaAPIWithPhone } from "./helpers/auth";
import { DashboardPage, TripDetailPage } from "./helpers/pages";
import { snap } from "./helpers/screenshots";

/**
 * E2E Journey: Itinerary CRUD, View Modes, and Permissions
 *
 * Consolidates 12 individual itinerary tests into 3 journey tests.
 * Uses authenticateViaAPI for fast auth.
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
  const dashboard = new DashboardPage(page);
  await dashboard.createTripButton.click();
  await expect(tripDetail.createDialogHeading).toBeVisible();
  await tripDetail.nameInput.fill(tripName);
  await tripDetail.destinationInput.fill(destination);
  await tripDetail.startDateInput.fill(startDate);
  await tripDetail.endDateInput.fill(endDate);
  await tripDetail.continueButton.click();
  await expect(tripDetail.step2Indicator).toBeVisible();
  await tripDetail.createTripButton.click();
  await page.waitForURL("**/trips/**");
  await expect(
    page.getByRole("heading", { level: 1, name: tripName }),
  ).toBeVisible();
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
    addButtonText?: string;
  },
) {
  const addButtonText = options?.addButtonText ?? "Add Event";
  await page.getByRole("button", { name: addButtonText }).click();
  await expect(
    page.getByRole("heading", { name: "Create a new event" }),
  ).toBeVisible();

  await page.locator('input[name="name"]').fill(name);

  if (options?.description) {
    await page.locator('textarea[name="description"]').fill(options.description);
  }

  if (options?.type) {
    await page.locator('button[role="combobox"]').first().click();
    await page
      .locator(`div[role="option"]`)
      .filter({ hasText: options.type })
      .click();
  }

  if (options?.location) {
    await page.locator('input[name="location"]').fill(options.location);
  }

  const startInput = page.locator('input[type="datetime-local"]').first();
  await startInput.scrollIntoViewIfNeeded();
  await startInput.click();
  await startInput.fill(startDateTime);

  if (options?.endDateTime) {
    const endInput = page.locator('input[type="datetime-local"]').nth(1);
    await endInput.scrollIntoViewIfNeeded();
    await endInput.click();
    await endInput.fill(options.endDateTime);
  }

  await page.getByRole("button", { name: "Create event" }).click();
}

test.describe("Itinerary Journey", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test(
    "itinerary CRUD journey",
    { tag: "@smoke", timeout: 60000 },
    async ({ page, request }) => {
      await authenticateViaAPI(page, request, "Itinerary Tester");
      const tripName = `Itinerary Trip ${Date.now()}`;

      await test.step("create trip", async () => {
        await createTrip(page, tripName, "San Diego, CA", "2026-10-01", "2026-10-03");
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
        await expect(page.getByText("Harbor Drive Seafood")).toBeVisible();
        await expect(page.getByText(/6:30 PM/)).toBeVisible();
      });

      await test.step("create accommodation", async () => {
        await page.getByRole("button", { name: "Accommodation" }).click();
        await expect(
          page.getByRole("heading", { name: "Create a new accommodation" }),
        ).toBeVisible();

        const accommodationName = `Downtown Hotel ${Date.now()}`;
        await page.locator('input[name="name"]').fill(accommodationName);
        await page.locator('input[name="address"]').fill("123 Main St, San Diego");
        await page
          .locator('textarea[name="description"]')
          .fill("Modern hotel in the heart of downtown");
        await page.locator('input[name="checkIn"]').fill("2026-10-01");
        await page.locator('input[name="checkOut"]').fill("2026-10-03");

        const linkInput = page.locator('input[aria-label="Link URL"]');
        await linkInput.fill("https://example.com/hotel");
        // Click the plus button adjacent to the link input (within the same form group)
        await linkInput.locator("..").locator("button:has(svg.lucide-plus)").click();

        await page.getByRole("button", { name: "Create accommodation" }).click();

        await expect(page.getByText("123 Main St, San Diego")).toBeVisible();
      });

      await snap(page, "09-itinerary-with-events");

      await test.step("add member travel", async () => {
        await page.getByRole("button", { name: "My Travel" }).click();
        await expect(
          page.getByRole("heading", { name: "Add your travel details" }),
        ).toBeVisible();

        await page.locator('input[type="radio"][value="arrival"]').click();

        const timeInput = page.locator('input[type="datetime-local"]').first();
        await timeInput.scrollIntoViewIfNeeded();
        await timeInput.click();
        await timeInput.fill("2026-10-01T14:30");

        await page.locator('input[name="location"]').fill("San Diego Airport");
        await page.locator('textarea[name="details"]').fill("Arriving from Chicago");
        await page.getByRole("button", { name: "Add travel details" }).click();

        await expect(page.getByText("San Diego Airport")).toBeVisible();
        await expect(page.getByText("Arriving from Chicago")).toBeVisible();
      });

      await test.step("edit event", async () => {
        await page.getByText(/Dinner at Harbor/).first().click();
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
        await expect(page.getByText("Gaslamp Quarter")).toBeVisible();
        await expect(page.getByText(/Dinner at Harbor/)).not.toBeVisible();
      });

      await test.step("delete event with cancel then confirm", async () => {
        // Find the event card — it may still be expanded from the edit step
        const card = page.locator('[role="button"][aria-expanded]')
          .filter({ hasText: /Updated Dinner/ })
          .first();
        const expanded = await card.getAttribute('aria-expanded');
        if (expanded !== 'true') {
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
      await createTrip(page, tripName, "Las Vegas, NV", "2027-03-10", "2027-03-13");

      const mealEvent = `Lunch ${Date.now()}`;
      await createEvent(page, mealEvent, "2027-03-10T12:00", { type: "Meal" });
      await expect(page.getByText(/Lunch/)).toBeVisible();

      const activityEvent = `Show ${Date.now()}`;
      await createEvent(page, activityEvent, "2027-03-10T20:00", {
        type: "Activity",
        addButtonText: "Event",
      });
      await expect(page.getByText(/Show/)).toBeVisible();
    });

    await snap(page, "10-itinerary-day-by-day");

    await test.step("toggle day-by-day to group-by-type", async () => {
      const dayByDayButton = page.getByRole("button", { name: "Day by Day" }).first();
      await expect(dayByDayButton).toBeVisible();

      await page.getByRole("button", { name: "Group by Type" }).click();

      await expect(
        page.getByRole("heading", { level: 3, name: "Meals" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 3, name: "Activities" }),
      ).toBeVisible();
      await expect(page.getByText(/Lunch/)).toBeVisible();
      await expect(page.getByText(/Show/)).toBeVisible();
      await snap(page, "11-itinerary-group-by-type");
    });

    await test.step("toggle back to day-by-day", async () => {
      await page.getByRole("button", { name: "Day by Day" }).click();
      await expect(page.getByText(/Lunch/)).toBeVisible();
      await expect(page.getByText(/Show/)).toBeVisible();
    });

    await test.step("toggle timezone", async () => {
      const tripTimezoneButton = page
        .locator("button", { hasText: /Trip \(.+\)/ })
        .first();
      await expect(tripTimezoneButton).toBeVisible();

      await page.locator("button", { hasText: /Your \(.+\)/ }).click();

      const userTimezoneButton = page
        .locator("button", { hasText: /Your \(.+\)/ })
        .first();
      await expect(userTimezoneButton).toBeVisible();
      await expect(page.getByText(/Lunch/)).toBeVisible();

      await page.locator("button", { hasText: /Trip \(.+\)/ }).click();
      await expect(tripTimezoneButton).toBeVisible();
    });

    await test.step("mobile viewport", async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      const header = page.locator(".sticky.top-0").first();
      await expect(header).toBeVisible();

      await expect(
        page.getByRole("button", { name: "Day by Day" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Group by Type" }),
      ).toBeVisible();
      await expect(
        page.locator("button", { hasText: /Trip \(.+\)/ }),
      ).toBeVisible();
      await expect(page.getByText(/Lunch/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Event" }),
      ).toBeVisible();

      // Dialog works on mobile
      await page.getByRole("button", { name: "Event" }).first().click();
      await expect(
        page.getByRole("heading", { name: "Create a new event" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");

      // Restore desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await expect(page.getByText(/Lunch/)).toBeVisible();
    });
  });

  test("itinerary permissions and validation", async ({ page, request }) => {
    const dashboard = new DashboardPage(page);

    await test.step("organizer creates trip and verifies action buttons", async () => {
      await authenticateViaAPI(page, request, "Trip Owner A");

      const tripName = `Permission Trip ${Date.now()}`;
      await createTrip(page, tripName, "Atlanta, GA", "2026-10-25", "2026-10-27");

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
      const startInput = page.locator('input[type="datetime-local"]').first();
      await startInput.click();
      await startInput.fill("2026-11-01T10:00");
      await page.getByRole("button", { name: "Create event" }).click();

      await expect(page.getByText("Valid Event")).toBeVisible();
    });

    await test.step("organizer can add events when member creation disabled", async () => {
      await page.context().clearCookies();
      await authenticateViaAPI(page, request, "Trip Organizer RSVP");

      const tripName = `RSVP Trip ${Date.now()}`;
      const tripDetail = new TripDetailPage(page);

      await dashboard.createTripButton.click();
      await expect(tripDetail.createDialogHeading).toBeVisible();
      await tripDetail.nameInput.fill(tripName);
      await tripDetail.destinationInput.fill("Chicago, IL");
      await tripDetail.startDateInput.fill("2026-09-20");
      await tripDetail.endDateInput.fill("2026-09-22");
      await tripDetail.continueButton.click();
      await expect(tripDetail.step2Indicator).toBeVisible();

      // Disable "Allow members to add events"
      const allowMembersCheckbox = page.locator(
        'button[role="checkbox"][aria-label="Allow members to add events"]',
      );
      await allowMembersCheckbox.click();

      await tripDetail.createTripButton.click();
      await page.waitForURL("**/trips/**");

      // Organizer can still add events
      await expect(
        page.getByRole("button", { name: "Add Event" }),
      ).toBeVisible();

      await createEvent(page, "Initial Event", "2026-09-20T10:00");

      await expect(
        page.getByRole("button", { name: "Event" }).first(),
      ).toBeVisible();
    });
  });
});
