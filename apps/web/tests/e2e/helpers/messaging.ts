import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { NAVIGATION_TIMEOUT, ELEMENT_TIMEOUT } from "./timeouts";

/** Helper: scroll to the discussion section and wait for it to be visible. */
export async function scrollToDiscussion(page: Page) {
  // Wait for the Discussion heading to be visible first -- this ensures the
  // TripMessages component has fully mounted and won't detach during a
  // React re-render (which causes "Element is not attached to the DOM").
  const heading = page.getByRole("heading", { name: "Discussion" });
  await heading.waitFor({ state: "visible", timeout: NAVIGATION_TIMEOUT });
  // Retry scroll in case a React re-render momentarily detaches the element
  await expect(async () => {
    await heading.scrollIntoViewIfNeeded();
  }).toPass({ timeout: ELEMENT_TIMEOUT });
  await expect(heading).toBeVisible({ timeout: ELEMENT_TIMEOUT });
}
