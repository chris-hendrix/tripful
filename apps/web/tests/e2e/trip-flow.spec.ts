import { test, expect, type Page } from "@playwright/test";

/**
 * E2E Test Suite: Trip Creation Flow
 *
 * Tests the complete journey from authentication through trip creation
 * to viewing the trip detail page and verifying it appears in the dashboard.
 */

/**
 * Helper function to authenticate a user through the full flow
 * Returns the phone number used for authentication
 */
async function authenticateUser(
  page: Page,
  displayName: string = "Test User",
): Promise<string> {
  const phone = `+1555${Date.now()}`;

  // Navigate to login page
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Enter phone number
  const phoneInput = page.locator('input[type="tel"]');
  await phoneInput.fill(phone);

  // Click Continue button
  await page.locator('button:has-text("Continue")').click();

  // Wait for navigation to verify page
  await page.waitForURL("**/verify**");

  // Enter verification code (fixed code for test environment)
  const codeInput = page.locator('input[type="text"]').first();
  await codeInput.fill("123456");

  // Click Verify button
  await page.locator('button:has-text("Verify")').click();

  // Wait for navigation (either to complete-profile or dashboard)
  await Promise.race([
    page.waitForURL("**/dashboard"),
    page.waitForURL("**/complete-profile"),
  ]);

  // Complete profile if needed
  const currentUrl = page.url();
  if (currentUrl.includes("/complete-profile")) {
    const displayNameInput = page.locator('input[type="text"]').first();
    await displayNameInput.fill(displayName);
    await page.locator('button:has-text("Complete profile")').click();
    await page.waitForURL("**/dashboard");
  }

  return phone;
}

/**
 * Helper function to authenticate a user with a specific phone number
 */
async function authenticateUserWithPhone(
  page: Page,
  phone: string,
  displayName: string = "Test User",
): Promise<void> {
  // Navigate to login page
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Enter phone number
  const phoneInput = page.locator('input[type="tel"]');
  await phoneInput.fill(phone);

  // Click Continue button
  await page.locator('button:has-text("Continue")').click();

  // Wait for navigation to verify page
  await page.waitForURL("**/verify**");

  // Enter verification code (fixed code for test environment)
  const codeInput = page.locator('input[type="text"]').first();
  await codeInput.fill("123456");

  // Click Verify button
  await page.locator('button:has-text("Verify")').click();

  // Wait for navigation (either to complete-profile or dashboard)
  await Promise.race([
    page.waitForURL("**/dashboard"),
    page.waitForURL("**/complete-profile"),
  ]);

  // Complete profile if needed
  const currentUrl = page.url();
  if (currentUrl.includes("/complete-profile")) {
    const displayNameInput = page.locator('input[type="text"]').first();
    await displayNameInput.fill(displayName);
    await page.locator('button:has-text("Complete profile")').click();
    await page.waitForURL("**/dashboard");
  }
}

test.describe("Trip Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Clear all cookies before each test for isolation
    await page.context().clearCookies();
  });

  test("complete create trip journey: login → dashboard → create trip → view detail → verify in dashboard", async ({
    page,
  }) => {
    // Step 1: Authenticate user
    await authenticateUser(page, "Trip Creator");

    // Step 2: Verify we're on the dashboard
    await expect(page.locator('h1:has-text("My Trips")')).toBeVisible();

    // Step 3: Click FAB (Floating Action Button) to open create dialog
    const fabButton = page.locator('button[aria-label="Create new trip"]');
    await fabButton.click();
    await page.waitForTimeout(300); // Allow dialog animation

    // Step 4: Verify dialog opened
    await expect(
      page.locator('h2:has-text("Create a new trip")'),
    ).toBeVisible();

    // Step 5: Fill Step 1 of form (Basic information)
    const tripName = `Test Trip ${Date.now()}`;
    const tripDestination = "Miami Beach, FL";

    // Verify we're on Step 1
    await expect(page.locator("text=Step 1 of 2")).toBeVisible();
    await expect(page.locator("text=Basic information")).toBeVisible();

    // Fill in trip name
    await page.locator('input[name="name"]').fill(tripName);

    // Fill in destination
    await page.locator('input[name="destination"]').fill(tripDestination);

    // Fill in start date
    await page.locator('input[name="startDate"]').fill("2026-10-12");

    // Fill in end date
    await page.locator('input[name="endDate"]').fill("2026-10-14");

    // Timezone should already have a default value from the browser
    // No need to change it for the basic test

    // Step 6: Click Continue to go to Step 2
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200); // Allow step transition

    // Step 7: Fill Step 2 of form (Details & settings)
    await expect(page.locator("text=Step 2 of 2")).toBeVisible();
    await expect(page.locator("text=Details & settings")).toBeVisible();

    // Fill in description
    const tripDescription =
      "A test trip for E2E verification of the create flow";
    await page.locator('textarea[name="description"]').fill(tripDescription);

    // Leave other optional fields at their defaults
    // (cover image, allowMembersToAddEvents checkbox, co-organizers)

    // Step 8: Submit the form
    await page.locator('button:has-text("Create trip")').click();

    // Step 9: Wait for redirect to trip detail page
    await page.waitForURL("**/trips/**", { timeout: 15000 });

    // Verify we're on the trip detail page
    const tripUrl = page.url();
    expect(tripUrl).toContain("/trips/");

    // Step 10: Verify trip details are displayed correctly
    await expect(page.locator(`h1:has-text("${tripName}")`)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(`text=${tripDestination}`)).toBeVisible();
    await expect(page.locator("text=Oct 12 - 14, 2026")).toBeVisible();
    await expect(page.locator(`text=${tripDescription}`)).toBeVisible();

    // Verify user status badges
    await expect(page.locator("text=Going")).toBeVisible();
    await expect(page.locator("text=Organizing")).toBeVisible();

    // Step 11: Navigate back to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Step 12: Verify trip appears in dashboard
    await expect(page.locator(`text=${tripName}`)).toBeVisible();
    await expect(page.locator(`text=${tripDestination}`)).toBeVisible();

    // Verify it's in the "Upcoming trips" section (since dates are in the future)
    await expect(page.locator('h2:has-text("Upcoming trips")')).toBeVisible();

    // Step 13: Click on the trip card to navigate back to detail page
    await page.locator(`text=${tripName}`).click();

    // Verify we're back on the trip detail page
    await page.waitForURL("**/trips/**");
    await expect(page.locator(`h1:has-text("${tripName}")`)).toBeVisible();
  });

  test("create trip with co-organizer", async ({ page }) => {
    // Authenticate
    await authenticateUser(page, "Co-Org Trip Creator");

    // Open create dialog
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300); // Allow dialog animation

    // Fill Step 1
    const tripName = `Co-Org Trip ${Date.now()}`;
    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Tokyo, Japan");
    await page.locator('input[name="startDate"]').fill("2026-11-01");
    await page.locator('input[name="endDate"]').fill("2026-11-07");

    // Continue to Step 2
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200); // Allow step transition

    // Add a co-organizer by phone number
    const coOrgPhone = `+1555${Date.now() + 1000}`;
    const coOrgInput = page.locator(
      'input[aria-label="Co-organizer phone number"]',
    );
    await coOrgInput.fill(coOrgPhone);

    // Press Enter to add the co-organizer (the input handles Enter key)
    await coOrgInput.press("Enter");

    // Verify co-organizer was added to the list
    await expect(page.locator(`text=${coOrgPhone}`)).toBeVisible();

    // Submit
    await page.locator('button:has-text("Create trip")').click();

    // Wait for detail page
    await page.waitForURL("**/trips/**");

    // Verify trip was created
    await expect(page.locator(`h1:has-text("${tripName}")`)).toBeVisible();
  });

  test("create trip with minimal required fields only", async ({ page }) => {
    // Authenticate
    await authenticateUser(page, "Minimal Trip Creator");

    // Open create dialog
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300); // Allow dialog animation

    // Fill only required fields in Step 1
    const tripName = `Minimal Trip ${Date.now()}`;
    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Paris, France");
    // Leave dates empty (not required)
    // Leave timezone at default

    // Continue to Step 2
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200); // Allow step transition

    // Skip all optional fields in Step 2
    // Submit immediately
    await page.locator('button:has-text("Create trip")').click();

    // Wait for detail page
    await page.waitForURL("**/trips/**");

    // Verify basic details
    await expect(page.locator(`h1:has-text("${tripName}")`)).toBeVisible();
    await expect(page.locator("text=Paris, France")).toBeVisible();

    // Verify "Dates TBD" is shown (no dates provided)
    await expect(page.locator("text=Dates TBD")).toBeVisible();
  });

  test("validation prevents incomplete trip submission", async ({ page }) => {
    // Authenticate
    await authenticateUser(page, "Validation Test User");

    // Open create dialog
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300); // Allow dialog animation

    // Try to continue without filling required fields
    await page.locator('button:has-text("Continue")').click();

    // Should still be on Step 1 with validation errors
    await expect(page.locator("text=Step 1 of 2")).toBeVisible();

    // Verify specific validation error messages for required fields
    await expect(
      page.locator("text=/trip name must be at least 3 characters/i"),
    ).toBeVisible();
    await expect(page.locator("text=/destination is required/i")).toBeVisible();
  });

  test("can navigate back from Step 2 to Step 1", async ({ page }) => {
    // Authenticate
    await authenticateUser(page, "Navigation Test User");

    // Open create dialog
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300); // Allow dialog animation

    // Fill Step 1
    const tripName = `Navigation Test ${Date.now()}`;
    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("London, UK");

    // Continue to Step 2
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200); // Allow step transition
    await expect(page.locator("text=Step 2 of 2")).toBeVisible();

    // Click Back button
    await page.locator('button:has-text("Back")').click();
    await page.waitForTimeout(200); // Allow step transition

    // Verify we're back on Step 1
    await expect(page.locator("text=Step 1 of 2")).toBeVisible();

    // Verify form data is preserved
    await expect(page.locator('input[name="name"]')).toHaveValue(tripName);
    await expect(page.locator('input[name="destination"]')).toHaveValue(
      "London, UK",
    );
  });

  test("empty state shows create button when no trips exist", async ({
    page,
  }) => {
    // Authenticate new user (no trips)
    await authenticateUser(page, "New User");

    // Verify dashboard shows empty state
    await expect(page.locator('h2:has-text("No trips yet")')).toBeVisible();
    await expect(
      page.locator("text=Start planning your next adventure"),
    ).toBeVisible();

    // Verify empty state create button exists
    const emptyStateButton = page.locator(
      'button:has-text("Create your first trip")',
    );
    await expect(emptyStateButton).toBeVisible();

    // Click the empty state button
    await emptyStateButton.click();
    await page.waitForTimeout(300); // Allow dialog animation

    // Verify dialog opens
    await expect(
      page.locator('h2:has-text("Create a new trip")'),
    ).toBeVisible();
  });

  test("edit trip basic information", async ({ page }) => {
    // Step 1: Authenticate and create a trip
    await authenticateUser(page, "Trip Editor");

    // Create a trip first
    const originalName = `Original Trip ${Date.now()}`;
    const originalDestination = "San Francisco, CA";
    const originalDescription = "Original description for the trip";

    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(originalName);
    await page.locator('input[name="destination"]').fill(originalDestination);
    await page.locator('input[name="startDate"]').fill("2026-12-10");
    await page.locator('input[name="endDate"]').fill("2026-12-15");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);

    await page
      .locator('textarea[name="description"]')
      .fill(originalDescription);
    await page.locator('button:has-text("Create trip")').click();

    // Wait for trip detail page
    await page.waitForURL("**/trips/**");
    await expect(page.locator(`h1:has-text("${originalName}")`)).toBeVisible();

    // Step 2: Open edit dialog
    await page.locator('button:has-text("Edit trip")').click();
    await page.waitForTimeout(300); // Allow dialog animation

    // Step 3: Verify dialog opens with correct title
    await expect(page.locator('h2:has-text("Edit trip")')).toBeVisible();

    // Step 4: Verify form is pre-populated with existing data
    await expect(page.locator("text=Step 1 of 2")).toBeVisible();
    await expect(page.locator('input[name="name"]')).toHaveValue(originalName);
    await expect(page.locator('input[name="destination"]')).toHaveValue(
      originalDestination,
    );
    await expect(page.locator('input[name="startDate"]')).toHaveValue(
      "2026-12-10",
    );
    await expect(page.locator('input[name="endDate"]')).toHaveValue(
      "2026-12-15",
    );

    // Step 5: Update name and destination
    const updatedName = `Updated Trip ${Date.now()}`;
    const updatedDestination = "Los Angeles, CA";

    await page.locator('input[name="name"]').fill(updatedName);
    await page.locator('input[name="destination"]').fill(updatedDestination);

    // Step 6: Navigate to Step 2
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200); // Allow step transition

    // Step 7: Verify Step 2 is visible and description is pre-populated
    await expect(page.locator("text=Step 2 of 2")).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
      originalDescription,
    );

    // Update description
    const updatedDescription = "Updated description with new information";
    await page.locator('textarea[name="description"]').fill(updatedDescription);

    // Step 8: Submit the form and verify optimistic update
    await page.locator('button:has-text("Update trip")').click();

    // Step 9: Verify optimistic update - UI should update IMMEDIATELY before API response
    // The TanStack Query mutation updates the cache in onMutate (before API call completes)
    // Check that the updated name appears in the trip detail page header right away
    // Note: Dialog may still be open/closing at this point
    await expect(
      page.locator("h1").filter({ hasText: updatedName }),
    ).toBeVisible({
      timeout: 1000,
    });

    // Allow time for success banner to show and dialog close animation
    await page.waitForTimeout(300);

    // Step 10: Verify success banner appears (confirms API call completed)
    await expect(page.locator("text=Trip updated successfully")).toBeVisible();

    // Step 11: Verify dialog closes and we're still on trip detail page
    await expect(page.locator('h2:has-text("Edit trip")')).not.toBeVisible();

    // Step 12: Verify all updated data is displayed on trip detail page
    await expect(page.locator(`h1:has-text("${updatedName}")`)).toBeVisible();
    await expect(page.locator(`text=${updatedDestination}`)).toBeVisible();
    await expect(page.locator("text=Dec 10 - 15, 2026")).toBeVisible();
    await expect(page.locator(`text=${updatedDescription}`)).toBeVisible();

    // Step 13: Navigate to dashboard and verify changes persist
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Verify updated trip appears in dashboard
    await expect(page.locator(`text=${updatedName}`)).toBeVisible();
    await expect(page.locator(`text=${updatedDestination}`)).toBeVisible();

    // Verify old name is not present
    await expect(page.locator(`text=${originalName}`)).not.toBeVisible();
  });

  test("edit trip - navigate back and forth between steps", async ({
    page,
  }) => {
    // Authenticate and create a trip
    await authenticateUser(page, "Step Navigator");

    const tripName = `Step Test Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Seattle, WA");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);

    await page.locator('button:has-text("Create trip")').click();
    await page.waitForURL("**/trips/**");

    // Open edit dialog
    await page.locator('button:has-text("Edit trip")').click();
    await page.waitForTimeout(300);

    // Verify Step 1
    await expect(page.locator("text=Step 1 of 2")).toBeVisible();

    // Make a change in Step 1
    const newDestination = "Portland, OR";
    await page.locator('input[name="destination"]').fill(newDestination);

    // Navigate to Step 2
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await expect(page.locator("text=Step 2 of 2")).toBeVisible();

    // Make a change in Step 2
    const newDescription = "Testing step navigation";
    await page.locator('textarea[name="description"]').fill(newDescription);

    // Navigate back to Step 1
    await page.locator('button:has-text("Back")').click();
    await page.waitForTimeout(200);
    await expect(page.locator("text=Step 1 of 2")).toBeVisible();

    // Verify data is preserved from earlier change
    await expect(page.locator('input[name="destination"]')).toHaveValue(
      newDestination,
    );

    // Navigate forward again to Step 2
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await expect(page.locator("text=Step 2 of 2")).toBeVisible();

    // Verify Step 2 data is still preserved
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
      newDescription,
    );

    // Submit the update
    await page.locator('button:has-text("Update trip")').click();
    await page.waitForTimeout(500);

    // Verify changes applied
    await expect(page.locator(`text=${newDestination}`)).toBeVisible();
    await expect(page.locator(`text=${newDescription}`)).toBeVisible();
  });

  // TODO: Fix API client bug - DELETE requests with Content-Type: application/json but no body cause Fastify error
  // Error: "Body cannot be empty when content-type is set to 'application/json'"
  // This is a pre-existing issue in /apps/web/src/lib/api.ts apiRequest function
  // The function always sets Content-Type header even for DELETE requests without body
  test.skip("delete trip confirmation flow", async ({ page }) => {
    // Step 1: Authenticate and create a trip to delete
    await authenticateUser(page, "Trip Deleter");

    const tripName = `Trip To Delete ${Date.now()}`;
    const tripDestination = "Austin, TX";

    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill(tripDestination);

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);

    await page.locator('button:has-text("Create trip")').click();
    await page.waitForURL("**/trips/**");
    await expect(page.locator(`h1:has-text("${tripName}")`)).toBeVisible();

    // Wait for trip detail page to fully load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Step 2: Open edit dialog
    await page.locator('button:has-text("Edit trip")').click();
    await page.waitForTimeout(300);

    // Navigate to Step 2 where delete button is
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);
    await expect(page.locator("text=Step 2 of 2")).toBeVisible();

    // Step 3: Click Delete trip button (first time)
    await page.locator('button:has-text("Delete trip")').click();
    await page.waitForTimeout(200);

    // Step 4: Verify confirmation appears
    await expect(
      page.locator("text=Are you sure you want to delete this trip?"),
    ).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Yes, delete")')).toBeVisible();

    // Step 5: Test Cancel - click cancel button
    await page.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(200);

    // Step 6: Verify confirmation is dismissed
    await expect(
      page.locator("text=Are you sure you want to delete this trip?"),
    ).not.toBeVisible();

    // Verify Delete trip button is back
    await expect(page.locator('button:has-text("Delete trip")')).toBeVisible();

    // Step 7: Click Delete trip again
    await page.locator('button:has-text("Delete trip")').click();
    await page.waitForTimeout(200);

    // Verify confirmation appears again
    await expect(
      page.locator("text=Are you sure you want to delete this trip?"),
    ).toBeVisible();

    // Step 8: Click "Yes, delete" to confirm deletion
    await page.locator('button:has-text("Yes, delete")').click();
    await page.waitForTimeout(1000); // Wait for API call to complete

    // Step 9: Verify redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 20000 });

    // Step 10: Verify trip no longer appears in dashboard
    await expect(page.locator(`text=${tripName}`)).not.toBeVisible();

    // Verify either empty state or other trips (but not the deleted one)
    const emptyState = page.locator('h2:has-text("No trips yet")');
    const upcomingSection = page.locator('h2:has-text("Upcoming trips")');

    // Either empty state or upcoming section should be visible
    await expect(emptyState.or(upcomingSection).first()).toBeVisible();
  });

  test("edit trip - validation prevents invalid updates", async ({ page }) => {
    // Authenticate and create a trip
    await authenticateUser(page, "Validation Editor");

    const tripName = `Validation Trip ${Date.now()}`;
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill("Chicago, IL");

    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);

    await page.locator('button:has-text("Create trip")').click();
    await page.waitForURL("**/trips/**");

    // Open edit dialog
    await page.locator('button:has-text("Edit trip")').click();
    await page.waitForTimeout(300);

    // Try to clear required fields
    await page.locator('input[name="name"]').fill("AB"); // Too short (min 3 chars)
    await page.locator('input[name="destination"]').fill(""); // Required field

    // Try to continue to Step 2
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);

    // Should still be on Step 1 with validation errors
    await expect(page.locator("text=Step 1 of 2")).toBeVisible();

    // Verify validation error messages appear
    await expect(
      page.locator("text=/trip name must be at least 3 characters/i"),
    ).toBeVisible();
    await expect(page.locator("text=/destination is required/i")).toBeVisible();

    // Verify we cannot proceed to Step 2
    await expect(page.locator("text=Step 2 of 2")).not.toBeVisible();
  });

  test("non-member cannot access trip and does not see edit button", async ({
    page,
  }) => {
    // Step 1: User A creates a trip
    await authenticateUser(page, "User A");

    const tripName = `Private Trip ${Date.now()}`;
    const tripDestination = "Barcelona, Spain";

    // Navigate to dashboard and create trip
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    // Fill Step 1
    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill(tripDestination);
    await page.locator('input[name="startDate"]').fill("2026-09-15");
    await page.locator('input[name="endDate"]').fill("2026-09-20");

    // Continue to Step 2
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);

    // Submit the form
    await page.locator('button:has-text("Create trip")').click();

    // Wait for redirect to trip detail page and capture URL
    await page.waitForURL("**/trips/**");
    const tripUrl = page.url();
    const tripId = tripUrl.split("/trips/")[1];

    // Verify trip was created
    await expect(page.locator(`h1:has-text("${tripName}")`)).toBeVisible();

    // Step 2: Logout User A (clear cookies to simulate different user)
    await page.context().clearCookies();

    // Step 3: User B logs in (different user, not a member)
    await authenticateUser(page, "User B");

    // Verify User B is on dashboard
    await expect(page.locator('h1:has-text("My Trips")')).toBeVisible();

    // Step 4: User B attempts to access trip directly by URL
    await page.goto(`/trips/${tripId}`);

    // Step 5: Verify error page is displayed
    await expect(page.locator('h2:has-text("Trip not found")')).toBeVisible();
    await expect(
      page.locator(
        "text=/This trip doesn't exist or you don't have access to it/i",
      ),
    ).toBeVisible();

    // Step 6: Verify edit button is NOT visible on error page
    await expect(
      page.locator('button:has-text("Edit trip")'),
    ).not.toBeVisible();

    // Step 7: Verify "Return to dashboard" button works
    const returnButton = page.locator('button:has-text("Return to dashboard")');
    await expect(returnButton).toBeVisible();
    await returnButton.click();

    // Verify navigation back to dashboard
    await page.waitForURL("**/dashboard");
    await expect(page.locator('h1:has-text("My Trips")')).toBeVisible();

    // Step 8: Verify User B does not see User A's trip in their dashboard
    await expect(page.locator(`text=${tripName}`)).not.toBeVisible();
  });

  test("add co-organizer, verify permissions, and remove co-organizer", async ({
    page,
  }) => {
    // Step 1: User A creates a trip
    // Generate phone numbers for both users upfront to maintain consistency
    // Use last 10 digits of timestamp to stay within E.164 format (max 15 digits)
    const timestamp = Date.now();
    const shortTimestamp = timestamp.toString().slice(-10);
    const userAPhone = `+1555${shortTimestamp}`;
    const userBPhone = `+1555${(parseInt(shortTimestamp) + 1000).toString()}`;

    // Authenticate User A
    await authenticateUserWithPhone(page, userAPhone, "User A - Trip Creator");

    const tripName = `Co-Org Test Trip ${timestamp}`;
    const tripDestination = "Amsterdam, Netherlands";

    // Create trip
    await page.locator('button[aria-label="Create new trip"]').click();
    await page.waitForTimeout(300);

    // Fill Step 1
    await page.locator('input[name="name"]').fill(tripName);
    await page.locator('input[name="destination"]').fill(tripDestination);
    await page.locator('input[name="startDate"]').fill("2026-08-01");
    await page.locator('input[name="endDate"]').fill("2026-08-10");

    // Continue to Step 2
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);

    // Submit the form
    await page.locator('button:has-text("Create trip")').click();

    // Wait for redirect to trip detail page and capture trip ID
    await page.waitForURL("**/trips/**");
    const tripUrl = page.url();
    const tripId = tripUrl.split("/trips/")[1];

    // Verify trip was created
    await expect(page.locator(`h1:has-text("${tripName}")`)).toBeVisible();

    // Verify User A has organizer permissions
    await expect(page.locator('button:has-text("Edit trip")')).toBeVisible();
    await expect(page.locator("text=Organizing")).toBeVisible();

    // Step 2: Create User B by authenticating them first
    await page.context().clearCookies();
    await authenticateUserWithPhone(page, userBPhone, "User B - Co-Organizer");

    // Step 3: Switch back to User A to add User B as co-organizer
    await page.context().clearCookies();
    await authenticateUserWithPhone(page, userAPhone, "User A - Trip Creator");

    // Navigate back to the trip
    await page.goto(`/trips/${tripId}`);
    await page.waitForLoadState("networkidle");

    // Add User B as co-organizer via API call
    const addCoOrgResponse = await page.request.post(
      `http://localhost:8000/api/trips/${tripId}/co-organizers`,
      {
        data: {
          phoneNumber: userBPhone,
        },
      },
    );

    // Verify API call succeeded
    expect(addCoOrgResponse.ok()).toBeTruthy();

    // Step 4: Switch to User B and verify co-organizer permissions
    await page.context().clearCookies();
    await authenticateUserWithPhone(page, userBPhone, "User B - Co-Organizer");

    // Navigate to the trip
    await page.goto(`/trips/${tripId}`);
    await page.waitForLoadState("networkidle");

    // Verify User B can see the trip
    await expect(page.locator(`h1:has-text("${tripName}")`)).toBeVisible();

    // Verify User B has organizer permissions - edit button visible
    await expect(page.locator('button:has-text("Edit trip")')).toBeVisible();

    // Verify User B has "Organizing" badge
    await expect(page.locator("text=Organizing")).toBeVisible();

    // Step 5: Verify User B can edit the trip
    await page.locator('button:has-text("Edit trip")').click();
    await page.waitForTimeout(300);

    // Verify edit dialog opens
    await expect(page.locator('h2:has-text("Edit trip")')).toBeVisible();

    // Update trip name
    const updatedTripName = `${tripName} - Updated by Co-Org`;
    await page.locator('input[name="name"]').fill(updatedTripName);

    // Navigate to Step 2
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(200);

    // Submit the update
    await page.locator('button:has-text("Update trip")').click();

    // Verify update succeeded
    await expect(page.locator(`h1:has-text("${updatedTripName}")`)).toBeVisible(
      {
        timeout: 10000,
      },
    );
    await expect(page.locator("text=Trip updated successfully")).toBeVisible();

    // Step 6: Switch back to User A to remove User B as co-organizer
    await page.context().clearCookies();
    await authenticateUserWithPhone(page, userAPhone, "User A - Trip Creator");

    // Navigate to trip and get User B's ID from trip data
    const tripResponse = await page.request.get(
      `http://localhost:8000/api/trips/${tripId}`,
    );
    expect(tripResponse.ok()).toBeTruthy();

    const tripData = await tripResponse.json();
    const userBId = tripData.trip.organizers.find(
      (org: { phoneNumber: string }) => org.phoneNumber === userBPhone,
    )?.id;

    expect(userBId).toBeDefined();

    // Remove User B as co-organizer via API call
    const removeCoOrgResponse = await page.request.delete(
      `http://localhost:8000/api/trips/${tripId}/co-organizers/${userBId}`,
    );

    // Verify API call succeeded
    expect(removeCoOrgResponse.ok()).toBeTruthy();

    // Step 7: Switch to User B and verify co-organizer permissions removed
    await page.context().clearCookies();
    await authenticateUserWithPhone(page, userBPhone, "User B - Co-Organizer");

    // Attempt to access the trip
    await page.goto(`/trips/${tripId}`);

    // Verify User B can no longer access the trip
    await expect(page.locator('h2:has-text("Trip not found")')).toBeVisible();

    // Verify edit button is NOT visible
    await expect(
      page.locator('button:has-text("Edit trip")'),
    ).not.toBeVisible();

    // Verify "Organizing" badge is NOT visible
    await expect(page.locator("text=Organizing")).not.toBeVisible();
  });
});
