import type { Page, Locator } from "@playwright/test";

export class ProfilePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly displayNameInput: Locator;
  readonly phoneNumberInput: Locator;
  readonly timezoneSelect: Locator;
  readonly venmoInput: Locator;
  readonly instagramInput: Locator;
  readonly saveButton: Locator;
  readonly uploadPhotoButton: Locator;
  readonly removePhotoButton: Locator;
  readonly photoFileInput: Locator;
  readonly profileAvatar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Profile" });
    this.displayNameInput = page.getByTestId("display-name-input");
    this.phoneNumberInput = page.getByTestId("phone-number-input");
    this.timezoneSelect = page.getByTestId("timezone-select");
    this.venmoInput = page.getByTestId("venmo-handle-input");
    this.instagramInput = page.getByTestId("instagram-handle-input");
    this.saveButton = page.getByTestId("save-profile-button");
    this.uploadPhotoButton = page.getByTestId("upload-photo-button");
    this.removePhotoButton = page.getByTestId("remove-photo-button");
    this.photoFileInput = page.getByTestId("photo-file-input");
    this.profileAvatar = page.getByTestId("profile-avatar");
  }

  async goto() {
    await this.page.goto("/profile");
  }
}
