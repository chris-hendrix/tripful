import { test, expect } from "@playwright/test";
import { authenticateUserViaBrowser } from "./helpers/auth";

/**
 * E2E Test Suite: Itinerary Flows
 *
 * Tests the complete itinerary functionality including:
 * - Creating events, accommodations, and member travel
 * - View mode toggling (day-by-day vs group-by-type)
 * - Timezone toggling
 * - Permission checks
 * - Delete operations
 */

test.describe("Itinerary Flows", () => {
  test.beforeEach(async ({ page }) => {
    // Clear all cookies before each test for isolation
    await page.context().clearCookies();
  });

  test("organizer creates event (meal type)", async ({ page }) => {
    // Step 1: Authenticate and create a trip
    await authenticateUserViaBrowser(page, "Meal Event Organizer");

    const tripName = `Meal Event Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("San Diego, CA");
    await page.locator('input[name="startDate"]').fill("2026-10-01");
    await page.locator('input[name="endDate"]').fill("2026-10-03");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create trip")').click();

    // Step 2: Wait for trip detail page and itinerary to load
    await page.waitForURL("**/trips/**");
    await expect(page.locator(`h1:has-text("${tripName}")`)).toBeVisible();

    // Wait for itinerary view to load (empty state shows first)
    await page.waitForTimeout(1000);

    // Step 3: Click "Add Event" button from empty state
    await page.locator('button:has-text("Add Event")').click();
    await page.waitForTimeout(300);

    // Step 4: Verify create event dialog opened
    await expect(
      page.locator('h2:has-text("Create a new event")'),
    ).toBeVisible();

    // Step 5: Fill event form (meal type)
    const eventName = `Dinner at Harbor ${Date.now()}`;
    await page.locator('input[name="name"]').fill(eventName);
    await page
      .locator('textarea[name="description"]')
      .fill("Seafood restaurant by the bay");

    // Select event type: meal
    await page.locator('button[role="combobox"]').first().click();
    await page.waitForTimeout(200);
    await page.locator('div[role="option"]:has-text("Meal")').click();

    await page.locator('input[name="location"]').fill("Harbor Drive Seafood");

    // Scroll to and fill datetime inputs (needs special handling for datetime-local)
    const startTimeInput = page.locator('input[type="datetime-local"]').first();
    await startTimeInput.scrollIntoViewIfNeeded();
    await startTimeInput.click();
    await startTimeInput.fill("2026-10-01T18:30");

    const endTimeInput = page.locator('input[type="datetime-local"]').nth(1);
    await endTimeInput.scrollIntoViewIfNeeded();
    await endTimeInput.click();
    await endTimeInput.fill("2026-10-01T20:00");

    // Step 6: Submit form
    await page.locator('button:has-text("Create event")').click();

    // Step 7: Wait for dialog to close and verify event appears
    await page.waitForTimeout(1000);

    // Step 8: Verify event appears in day-by-day view
    await expect(page.locator(`text=/Dinner at Harbor/`)).toBeVisible();
    await expect(page.locator("text=Harbor Drive Seafood")).toBeVisible();
    await expect(page.locator("text=/6:30 PM/")).toBeVisible();
  });

  test("organizer creates accommodation", async ({ page }) => {
    // Step 1: Authenticate and create a trip
    await authenticateUserViaBrowser(page, "Accommodation Organizer");

    const tripName = `Accommodation Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Portland, OR");
    await page.locator('input[name="startDate"]').fill("2026-11-05");
    await page.locator('input[name="endDate"]').fill("2026-11-08");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create trip")').click();

    // Step 2: Wait for trip detail page
    await page.waitForURL("**/trips/**");
    await expect(page.locator(`h1:has-text("${tripName}")`)).toBeVisible();
    await page.waitForTimeout(1000);

    // Step 3: Click "Add Accommodation" button from empty state
    await page.locator('button:has-text("Add Accommodation")').click();
    await page.waitForTimeout(300);

    // Step 4: Verify create accommodation dialog opened
    await expect(
      page.locator('h2:has-text("Create a new accommodation")'),
    ).toBeVisible();

    // Step 5: Fill accommodation form
    const accommodationName = `Downtown Hotel ${Date.now()}`;
    await page.locator('input[name="name"]').fill(accommodationName);
    await page.locator('input[name="address"]').fill("123 Main St, Portland");
    await page
      .locator('textarea[name="description"]')
      .fill("Modern hotel in the heart of downtown");
    await page.locator('input[name="checkIn"]').fill("2026-11-05");
    await page.locator('input[name="checkOut"]').fill("2026-11-08");

    // Add a link (button only has Plus icon, no text)
    await page
      .locator('input[aria-label="Link URL"]')
      .fill("https://example.com/hotel");
    // Click the Plus icon button next to the link input
    await page.locator('button:has(svg.lucide-plus)').click();

    // Step 6: Submit form
    await page.locator('button:has-text("Create accommodation")').click();

    // Step 7: Wait for accommodation to appear
    await page.waitForTimeout(1000);

    // Step 8: Verify accommodation appears in view
    await expect(page.locator(`text=/${accommodationName.split(' ')[0]}/`)).toBeVisible();
    await expect(page.locator("text=123 Main St, Portland")).toBeVisible();
  });

  test("member adds member travel (arrival)", async ({ page }) => {
    // Step 1: Authenticate and create a trip
    await authenticateUserViaBrowser(page, "Travel Member");

    const tripName = `Travel Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Denver, CO");
    await page.locator('input[name="startDate"]').fill("2026-12-10");
    await page.locator('input[name="endDate"]').fill("2026-12-13");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create trip")').click();

    // Step 2: Wait for trip detail page
    await page.waitForURL("**/trips/**");
    await expect(page.locator(`h1:has-text("${tripName}")`)).toBeVisible();
    await page.waitForTimeout(1000);

    // First create an event to get out of empty state
    await page.locator('button:has-text("Add Event")').click();
    await page.waitForTimeout(300);
    await page.locator('input[name="name"]').fill("Initial Event");
    const startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.click();
    await startInput.fill("2026-12-10T10:00");
    await page.locator('button:has-text("Create event")').click();
    await page.waitForTimeout(1000);

    // Step 3: Click "My Travel" button from header (has Plus icon before text)
    await page.locator('button:has-text("My Travel")').click();
    await page.waitForTimeout(300);

    // Step 4: Verify create member travel dialog opened
    await expect(
      page.locator('h2:has-text("Add your travel details")'),
    ).toBeVisible();

    // Step 5: Fill member travel form (arrival)
    // Select arrival type
    await page.locator('input[type="radio"][value="arrival"]').click();

    const timeInput = page.locator('input[type="datetime-local"]').first();
    await timeInput.scrollIntoViewIfNeeded();
    await timeInput.click();
    await timeInput.fill("2026-12-10T14:30");

    await page
      .locator('input[name="location"]')
      .fill("Denver International Airport");
    await page
      .locator('textarea[name="details"]')
      .fill("Arriving from Chicago");

    // Step 6: Submit form
    await page.locator('button:has-text("Add travel details")').click();

    // Step 7: Wait and verify travel appears in view
    await page.waitForTimeout(1000);
    await expect(
      page.locator("text=Denver International Airport"),
    ).toBeVisible();
    await expect(page.locator("text=Arriving from Chicago")).toBeVisible();
  });

  test("toggle view mode from day-by-day to group-by-type", async ({
    page,
  }) => {
    // Step 1: Authenticate and create a trip with an event
    await authenticateUserViaBrowser(page, "View Toggle User");

    const tripName = `View Toggle Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Boston, MA");
    await page.locator('input[name="startDate"]').fill("2026-09-15");
    await page.locator('input[name="endDate"]').fill("2026-09-17");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create trip")').click();

    await page.waitForURL("**/trips/**");
    await page.waitForTimeout(1000);

    // Add an event
    await page.locator('button:has-text("Add Event")').click();
    await page.waitForTimeout(300);

    const eventName = `Museum Visit ${Date.now()}`;
    await page.locator('input[name="name"]').fill(eventName);
    const startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.click();
    await startInput.fill("2026-09-15T10:00");

    await page.locator('button:has-text("Create event")').click();
    await page.waitForTimeout(1000);

    // Step 2: Verify we're in day-by-day view (default)
    // The active button has variant="default", inactive has variant="ghost"
    const dayByDayButton = page.locator('button:has-text("Day by Day")').first();
    await expect(dayByDayButton).toBeVisible();

    // Step 3: Click "Group by Type" toggle
    await page.locator('button:has-text("Group by Type")').click();
    await page.waitForTimeout(200);

    // Step 4: Verify view mode changed
    const groupByTypeButton = page.locator('button:has-text("Group by Type")').first();
    await expect(groupByTypeButton).toBeVisible();

    // Step 5: Verify events are grouped by type (check for section header)
    await expect(page.locator('h3:has-text("Activities")')).toBeVisible();
    await expect(page.locator(`text=/Museum Visit/`)).toBeVisible();

    // Step 6: Switch back to day-by-day
    await page.locator('button:has-text("Day by Day")').click();
    await page.waitForTimeout(200);

    await expect(dayByDayButton).toBeVisible();
  });

  test("toggle timezone from trip to user timezone", async ({ page }) => {
    // Step 1: Authenticate and create a trip with an event
    await authenticateUserViaBrowser(page, "Timezone Toggle User");

    const tripName = `Timezone Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Seattle, WA");
    await page.locator('input[name="startDate"]').fill("2026-08-20");
    await page.locator('input[name="endDate"]').fill("2026-08-22");

    // The timezone selector is a standard Select (not a searchable combobox).
    // The default timezone is auto-detected from the browser, so we just proceed
    // without changing it. The toggle test will verify switching between trip and user timezone.

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create trip")').click();

    await page.waitForURL("**/trips/**");
    await page.waitForTimeout(1000);

    // Add an event with a specific time
    await page.locator('button:has-text("Add Event")').click();
    await page.waitForTimeout(300);

    const eventName = `Timed Event ${Date.now()}`;
    await page.locator('input[name="name"]').fill(eventName);
    const startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.click();
    await startInput.fill("2026-08-20T14:00");

    await page.locator('button:has-text("Create event")').click();
    await page.waitForTimeout(1000);

    // Step 2: Verify we're showing trip timezone (default)
    const tripTimezoneButton = page
      .locator('button', { hasText: /Trip \(.+\)/ })
      .first();
    await expect(tripTimezoneButton).toBeVisible();

    // Step 3: Toggle to user timezone
    await page.locator('button', { hasText: /Your \(.+\)/ }).click();
    await page.waitForTimeout(200);

    // Step 4: Verify timezone toggle changed
    const userTimezoneButton = page
      .locator('button', { hasText: /Your \(.+\)/ })
      .first();
    await expect(userTimezoneButton).toBeVisible();

    // Step 5: Verify event is still visible
    await expect(page.locator(`text=/Timed Event/`)).toBeVisible();

    // Step 6: Toggle back to trip timezone
    await page.locator('button', { hasText: /Trip \(.+\)/ }).click();
    await page.waitForTimeout(200);

    await expect(tripTimezoneButton).toBeVisible();
  });

  test("organizer soft deletes event", async ({ page }) => {
    // Step 1: Authenticate and create a trip with an event
    await authenticateUserViaBrowser(page, "Event Deleter");

    const tripName = `Delete Event Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Phoenix, AZ");
    await page.locator('input[name="startDate"]').fill("2027-01-10");
    await page.locator('input[name="endDate"]').fill("2027-01-12");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create trip")').click();

    await page.waitForURL("**/trips/**");
    await page.waitForTimeout(1000);

    // Create an event to delete
    await page.locator('button:has-text("Add Event")').click();
    await page.waitForTimeout(300);

    const eventName = `Event to Delete ${Date.now()}`;
    await page.locator('input[name="name"]').fill(eventName);
    const startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.click();
    await startInput.fill("2027-01-10T09:00");

    await page.locator('button:has-text("Create event")').click();
    await page.waitForTimeout(1000);

    // Verify event exists
    await expect(page.locator(`text=/Event to Delete/`)).toBeVisible();

    // Step 2: Expand the event card to access edit button
    const eventCard = page.locator(`text=/Event to Delete/`).first();
    await eventCard.click();
    await page.waitForTimeout(300);

    // Step 3: Click Edit button to open edit dialog (scoped to event card, not trip header)
    await page.locator('button[title="Edit event"]').first().click();
    await page.waitForTimeout(300);

    // Step 4: Verify edit dialog opened
    await expect(page.locator('h2:has-text("Edit event")')).toBeVisible();

    // Step 5: Click "Delete event" button in the edit dialog
    await page.locator('button:has-text("Delete event")').click();
    await page.waitForTimeout(200);

    // Step 6: Verify confirmation dialog appears
    await expect(page.locator("text=Are you sure?")).toBeVisible();

    // Step 7: Test cancel - click cancel button
    await page.locator('button:has-text("Cancel")').last().click();
    await page.waitForTimeout(200);

    // Step 8: Verify we're back in edit dialog
    await expect(page.locator('h2:has-text("Edit event")')).toBeVisible();

    // Step 9: Try delete again
    await page.locator('button:has-text("Delete event")').click();
    await page.waitForTimeout(200);

    // Step 10: Confirm deletion
    await page.locator('button:has-text("Yes, delete")').click();
    await page.waitForTimeout(1000);

    // Step 11: Verify event is no longer visible
    await expect(page.locator(`text=/Event to Delete/`)).not.toBeVisible();
  });

  test("non-member cannot add event", async ({ page }) => {
    // Step 1: User A creates a trip
    const timestampA = Date.now();
    await authenticateUserViaBrowser(page, "Trip Owner A");

    const tripName = `Private Event Trip ${timestampA}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Atlanta, GA");
    await page.locator('input[name="startDate"]').fill("2026-10-25");
    await page.locator('input[name="endDate"]').fill("2026-10-27");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create trip")').click();

    await page.waitForURL("**/trips/**");
    const tripUrl = page.url();
    const tripId = tripUrl.split("/trips/")[1];
    await page.waitForTimeout(1000);

    // Step 2: Verify User A sees action buttons in empty state
    await expect(page.locator('button:has-text("Add Event")')).toBeVisible();
    await expect(
      page.locator('button:has-text("Add Accommodation")'),
    ).toBeVisible();

    // Step 3: Logout User A
    await page.context().clearCookies();

    // Step 4: User B logs in (different user, not a member)
    await authenticateUserViaBrowser(page, "Non-Member B");

    // Step 5: User B attempts to access trip directly by URL
    await page.goto(`/trips/${tripId}`);
    await page.waitForTimeout(500);

    // Step 6: Verify error page is displayed (non-member has no access)
    await expect(page.locator('h2:has-text("Trip not found")')).toBeVisible();

    // Step 7: Verify action buttons are NOT visible
    await expect(page.locator('button:has-text("Add Event")')).not.toBeVisible();
    await expect(
      page.locator('button:has-text("Add Accommodation")'),
    ).not.toBeVisible();
  });

  test("validation prevents incomplete event submission", async ({ page }) => {
    // Step 1: Authenticate and create a trip
    await authenticateUserViaBrowser(page, "Validation Tester");

    const tripName = `Validation Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Miami, FL");
    await page.locator('input[name="startDate"]').fill("2026-11-01");
    await page.locator('input[name="endDate"]').fill("2026-11-03");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create trip")').click();

    await page.waitForURL("**/trips/**");
    await page.waitForTimeout(1000);

    // Step 2: Open create event dialog
    await page.locator('button:has-text("Add Event")').click();
    await page.waitForTimeout(300);

    // Step 3: Try to submit without filling required fields
    await page.locator('button:has-text("Create event")').click();
    await page.waitForTimeout(300);

    // Step 4: Verify validation error messages appear
    await expect(
      page.locator("text=Event name must be at least 1 character"),
    ).toBeVisible();
    await expect(
      page.locator("text=Invalid datetime"),
    ).toBeVisible();

    // Step 5: Verify dialog is still open (not submitted)
    await expect(
      page.locator('h2:has-text("Create a new event")'),
    ).toBeVisible();

    // Step 6: Fill in minimal required fields
    await page.locator('input[name="name"]').fill("Valid Event");
    const startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.click();
    await startInput.fill("2026-11-01T10:00");

    // Step 7: Submit successfully
    await page.locator('button:has-text("Create event")').click();
    await page.waitForTimeout(1000);

    // Step 8: Verify success - event appears
    await expect(page.locator("text=Valid Event")).toBeVisible();
  });

  test("organizer edits event", async ({ page }) => {
    // Step 1: Authenticate and create a trip with an event
    await authenticateUserViaBrowser(page, "Event Editor");

    const tripName = `Edit Event Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Nashville, TN");
    await page.locator('input[name="startDate"]').fill("2026-07-15");
    await page.locator('input[name="endDate"]').fill("2026-07-17");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create trip")').click();

    await page.waitForURL("**/trips/**");
    await page.waitForTimeout(1000);

    // Create an event to edit
    await page.locator('button:has-text("Add Event")').click();
    await page.waitForTimeout(300);

    const originalEventName = `Original Event ${Date.now()}`;
    await page.locator('input[name="name"]').fill(originalEventName);
    const startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.click();
    await startInput.fill("2026-07-15T11:00");

    await page.locator('button:has-text("Create event")').click();
    await page.waitForTimeout(1000);

    // Step 2: Expand the event card
    await page.locator(`text=/Original Event/`).first().click();
    await page.waitForTimeout(300);

    // Step 3: Click edit button (scoped to event card, not trip header)
    await page.locator('button[title="Edit event"]').first().click();
    await page.waitForTimeout(300);

    // Step 4: Verify edit dialog opened with pre-filled data
    await expect(page.locator('h2:has-text("Edit event")')).toBeVisible();

    // Step 5: Update event details
    const updatedEventName = `Updated Event ${Date.now()}`;
    const nameInput = page.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill(updatedEventName);
    await page
      .locator('input[name="location"]')
      .fill("Grand Ole Opry");

    // Step 6: Submit update
    await page.locator('button:has-text("Update event")').click();
    await page.waitForTimeout(1000);

    // Step 7: Verify updated data appears
    await expect(page.locator(`text=/Updated Event/`)).toBeVisible();
    await expect(page.locator("text=Grand Ole Opry")).toBeVisible();

    // Verify old name is gone
    await expect(
      page.locator(`text=/Original Event/`),
    ).not.toBeVisible();
  });

  test("responsive layout adapts to mobile viewport", async ({ page }) => {
    // Step 1: Authenticate and create a trip
    await authenticateUserViaBrowser(page, "Mobile User");

    const tripName = `Mobile Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Austin, TX");
    await page.locator('input[name="startDate"]').fill("2026-12-01");
    await page.locator('input[name="endDate"]').fill("2026-12-03");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create trip")').click();

    await page.waitForURL("**/trips/**");
    await page.waitForTimeout(1000);

    // Add an event
    await page.locator('button:has-text("Add Event")').click();
    await page.waitForTimeout(300);

    const eventName = `Mobile Event ${Date.now()}`;
    await page.locator('input[name="name"]').fill(eventName);
    const startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.click();
    await startInput.fill("2026-12-01T15:00");

    await page.locator('button:has-text("Create event")').click();
    await page.waitForTimeout(1000);

    // Step 2: Resize viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Step 3: Verify responsive layout
    // Header controls should be visible
    const header = page.locator(".sticky.top-0").first();
    await expect(header).toBeVisible();

    // Verify view toggle buttons are still visible
    await expect(
      page.locator('button:has-text("Day by Day")'),
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("Group by Type")'),
    ).toBeVisible();

    // Verify timezone toggle is still visible
    await expect(
      page.locator('button', { hasText: /Trip \(.+\)/ }),
    ).toBeVisible();

    // Verify event is still visible
    await expect(page.locator(`text=/Mobile Event/`)).toBeVisible();

    // Verify action buttons are visible (has Plus icon + "Event" text)
    await expect(page.locator('button:has-text("Event")')).toBeVisible();

    // Step 4: Test that dialog works on mobile
    // Use more specific selector to avoid matching "Create event" button in dialog
    await page.locator('button:has-text("Event")').first().click();
    await page.waitForTimeout(300);

    await expect(
      page.locator('h2:has-text("Create a new event")'),
    ).toBeVisible();

    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Step 5: Resize back to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(300);

    // Verify layout still works
    await expect(page.locator(`text=/Mobile Event/`)).toBeVisible();
  });

  test("organizer creates multiple events and switches between views", async ({
    page,
  }) => {
    // Step 1: Authenticate and create a trip
    await authenticateUserViaBrowser(page, "Multi Event User");

    const tripName = `Multi Event Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Las Vegas, NV");
    await page.locator('input[name="startDate"]').fill("2027-03-10");
    await page.locator('input[name="endDate"]').fill("2027-03-13");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create trip")').click();

    await page.waitForURL("**/trips/**");
    await page.waitForTimeout(1000);

    // Step 2: Create multiple events of different types
    const mealEvent = `Lunch ${Date.now()}`;
    await page.locator('button:has-text("Add Event")').click();
    await page.waitForTimeout(300);
    await page.locator('input[name="name"]').fill(mealEvent);
    await page.locator('button[role="combobox"]').first().click();
    await page.waitForTimeout(200);
    await page.locator('div[role="option"]:has-text("Meal")').click();
    let startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.click();
    await startInput.fill("2027-03-10T12:00");
    await page.locator('button:has-text("Create event")').click();
    await page.waitForTimeout(1000);

    const activityEvent = `Show ${Date.now()}`;
    // Click the header "Event" button (not dialog buttons)
    await page.locator('button:has-text("Event")').first().click();
    await page.waitForTimeout(300);
    await page.locator('input[name="name"]').fill(activityEvent);
    await page.locator('button[role="combobox"]').first().click();
    await page.waitForTimeout(200);
    await page.locator('div[role="option"]:has-text("Activity")').click();
    startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.click();
    await startInput.fill("2027-03-10T20:00");
    await page.locator('button:has-text("Create event")').click();
    await page.waitForTimeout(1000);

    // Step 3: Verify both events in day-by-day view
    await expect(page.locator(`text=/Lunch/`)).toBeVisible();
    await expect(page.locator(`text=/Show/`)).toBeVisible();

    // Step 4: Switch to group-by-type view
    await page.locator('button:has-text("Group by Type")').click();
    await page.waitForTimeout(300);

    // Step 5: Verify events are grouped by type
    await expect(page.locator('h3:has-text("Meals")')).toBeVisible();
    await expect(page.locator('h3:has-text("Activities")')).toBeVisible();

    // Both events should still be visible
    await expect(page.locator(`text=/Lunch/`)).toBeVisible();
    await expect(page.locator(`text=/Show/`)).toBeVisible();

    // Step 6: Switch back to day-by-day
    await page.locator('button:has-text("Day by Day")').click();
    await page.waitForTimeout(300);

    // Verify both events still visible
    await expect(page.locator(`text=/Lunch/`)).toBeVisible();
    await expect(page.locator(`text=/Show/`)).toBeVisible();
  });

  test("organizer can add events when member event creation is disabled", async ({ page }) => {
    // This test verifies that permission logic exists in the header component by checking
    // that the organizer can still add events when allowMembersToAddEvents is disabled.
    // Full RSVP-based permission testing is blocked by Phase 5 implementation.

    // Step 1: User A (Organizer) creates a trip
    await authenticateUserViaBrowser(page, "Trip Organizer RSVP");

    const tripName = `RSVP Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Chicago, IL");
    await page.locator('input[name="startDate"]').fill("2026-09-20");
    await page.locator('input[name="endDate"]').fill("2026-09-22");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);

    // Step 2: Disable "Allow members to add events" setting
    // The checkbox is a shadcn Checkbox (renders as button[role="checkbox"]), not a native input
    const allowMembersCheckbox = page.locator('button[role="checkbox"][aria-label="Allow members to add events"]');
    await allowMembersCheckbox.click();
    await page.waitForTimeout(200);

    await page.locator('button:has-text("Create trip")').click();
    await page.waitForURL("**/trips/**");
    await page.waitForTimeout(1000);

    // Step 3: Verify organizer can still add events
    await expect(page.locator('button:has-text("Add Event")')).toBeVisible();

    // Add an event so we're not in empty state
    await page.locator('button:has-text("Add Event")').click();
    await page.waitForTimeout(300);
    await page.locator('input[name="name"]').fill("Initial Event");
    const startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.click();
    await startInput.fill("2026-09-20T10:00");
    await page.locator('button:has-text("Create event")').click();
    await page.waitForTimeout(1000);

    // Step 4: Verify "Event" button is visible in header (organizer can add)
    await expect(page.locator('button:has-text("Event")').first()).toBeVisible();

    // Note: Full RSVP flow test would require:
    // 1. Inviting a second user to the trip
    // 2. That user setting their RSVP to "not going"
    // 3. Verifying that the "Add Event" button is hidden for that user
    // This is blocked by RSVP feature implementation in Phase 5.
  });

  test.fixme("organizer restores soft-deleted event", async ({ page }) => {
    // FIXME: This test is a placeholder because the UI for viewing/restoring
    // deleted items has not been implemented yet. The API supports soft delete and restore,
    // but there's no frontend UI to access deleted items. Blocked by deleted items management UI.

    // Step 1: Authenticate and create a trip with an event
    await authenticateUserViaBrowser(page, "Event Restorer");

    const tripName = `Restore Event Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Seattle, WA");
    await page.locator('input[name="startDate"]').fill("2027-02-10");
    await page.locator('input[name="endDate"]').fill("2027-02-12");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create trip")').click();

    await page.waitForURL("**/trips/**");
    await page.waitForTimeout(1000);

    // Create an event to delete and restore
    await page.locator('button:has-text("Add Event")').click();
    await page.waitForTimeout(300);

    const eventName = `Restorable Event ${Date.now()}`;
    await page.locator('input[name="name"]').fill(eventName);
    const startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.click();
    await startInput.fill("2027-02-10T14:00");

    await page.locator('button:has-text("Create event")').click();
    await page.waitForTimeout(1000);

    // Verify event exists
    await expect(page.locator(`text=/Restorable Event/`)).toBeVisible();

    // Step 2: Delete the event
    const eventCard = page.locator(`text=/Restorable Event/`).first();
    await eventCard.click();
    await page.waitForTimeout(300);

    await page.locator('button[title="Edit event"]').first().click();
    await page.waitForTimeout(300);

    await page.locator('button:has-text("Delete event")').click();
    await page.waitForTimeout(200);

    await page.locator('button:has-text("Yes, delete")').click();
    await page.waitForTimeout(1000);

    // Verify event is no longer visible
    await expect(page.locator(`text=/Restorable Event/`)).not.toBeVisible();

    // Step 3: Verify there's no UI to view/restore deleted items
    // Look for any "Deleted Items" or "Trash" or "Restore" buttons
    await expect(page.locator('button:has-text("Deleted")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Trash")')).not.toBeVisible();
    await expect(page.locator('text=/deleted items/i')).not.toBeVisible();

    // Note: Full restore test would require:
    // 1. A UI element to view deleted items (e.g., "Show deleted items" toggle)
    // 2. A "Restore" button on each deleted item
    // 3. Verification that restored item reappears in the itinerary
    // This is blocked by missing UI for deleted items management.
  });
});
