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
});
