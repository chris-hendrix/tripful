import type { Page, Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createTripButton: Locator;
  readonly userMenuButton: Locator;
  readonly emptyStateHeading: Locator;
  readonly emptyStateCreateButton: Locator;
  readonly upcomingTripsHeading: Locator;
  readonly logoutItem: Locator;
  readonly profileItem: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "My Trips" });
    this.createTripButton = page.getByRole("button", {
      name: "Create new trip",
    });
    this.userMenuButton = page.getByRole("button", { name: "User menu" });
    this.emptyStateHeading = page.getByRole("heading", {
      name: "No trips yet",
    });
    this.emptyStateCreateButton = page.getByRole("button", {
      name: "Create your first trip",
    });
    this.upcomingTripsHeading = page.getByRole("heading", {
      name: "Upcoming trips",
    });
    this.logoutItem = page.getByText("Log out");
    this.profileItem = page.getByText("Profile");
  }

  async goto() {
    await this.page.goto("/dashboard");
  }

  async openUserMenu() {
    await this.userMenuButton.click();
  }

  async logout() {
    await this.openUserMenu();
    await this.logoutItem.click();
  }
}
