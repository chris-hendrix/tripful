import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { TripsPage, TripDetailPage } from "./pages";
import { pickDate } from "./date-pickers";
import { dismissToast } from "./toast";

/** Create a trip via the UI and land on the trip detail page. */
export async function createTrip(
  page: Page,
  tripName: string,
  destination: string,
  startDate: string,
  endDate: string,
) {
  const tripDetail = new TripDetailPage(page);
  const trips = new TripsPage(page);

  // Dismiss any Sonner toast that could intercept the FAB click
  await dismissToast(page);

  // Ensure the FAB is visible and stable before clicking
  await trips.createTripButton.waitFor({ state: "visible", timeout: 10000 });
  await trips.createTripButton.click();
  await expect(tripDetail.createDialogHeading).toBeVisible({ timeout: 15000 });
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
