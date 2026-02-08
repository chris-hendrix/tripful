import type { Page, Locator } from "@playwright/test";

export class TripDetailPage {
  readonly page: Page;
  readonly tripHeading: Locator;
  readonly editButton: Locator;
  readonly editDialogHeading: Locator;
  readonly createDialogHeading: Locator;
  readonly nameInput: Locator;
  readonly destinationInput: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly descriptionInput: Locator;
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly createTripButton: Locator;
  readonly updateTripButton: Locator;
  readonly deleteTripButton: Locator;
  readonly step1Indicator: Locator;
  readonly step2Indicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tripHeading = page.getByRole("heading", { level: 1 });
    this.editButton = page.getByRole("button", { name: "Edit trip" });
    this.editDialogHeading = page.getByRole("heading", { name: "Edit trip" });
    this.createDialogHeading = page.getByRole("heading", {
      name: "Create a new trip",
    });
    this.nameInput = page.locator('input[name="name"]');
    this.destinationInput = page.locator('input[name="destination"]');
    this.startDateInput = page.locator('input[name="startDate"]');
    this.endDateInput = page.locator('input[name="endDate"]');
    this.descriptionInput = page.locator('textarea[name="description"]');
    this.continueButton = page.getByRole("button", { name: "Continue" });
    this.backButton = page.getByRole("button", { name: "Back" });
    this.createTripButton = page.getByRole("button", { name: "Create trip" });
    this.updateTripButton = page.getByRole("button", { name: "Update trip" });
    this.deleteTripButton = page.getByRole("button", { name: "Delete trip" });
    this.step1Indicator = page.getByText("Step 1 of 2");
    this.step2Indicator = page.getByText("Step 2 of 2");
  }
}
