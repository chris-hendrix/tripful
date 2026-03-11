import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { navigateToMobilePanel } from "./mobile-panels";
import { NAVIGATION_TIMEOUT, ELEMENT_TIMEOUT } from "./timeouts";

/**
 * Helper: scroll to the discussion section and wait for it to be visible.
 *
 * On desktop the discussion section is below the fold with a "Discussion"
 * heading. On mobile it lives in the Messages panel (no heading — the icon
 * strip already labels the panel). This helper handles both layouts.
 */
export async function scrollToDiscussion(page: Page) {
  // On mobile the discussion section lives in the Messages panel.
  await navigateToMobilePanel(page, "Messages");

  // Wait for network to settle so React re-renders from data fetching are done,
  // preventing "Element is not attached to the DOM" errors during scroll.
  await page.waitForLoadState("networkidle");

  // Desktop has a visible "Discussion" heading; mobile uses an aria-labelled
  // section without a heading. Try the heading first, fall back to the section.
  const heading = page.getByRole("heading", { name: "Discussion" });
  const section = page.getByRole("region", { name: "Trip discussion" });

  const target = heading.or(section);

  await target.first().waitFor({ state: "visible", timeout: NAVIGATION_TIMEOUT });
  // Retry scroll in case a React re-render momentarily detaches the element
  await expect(async () => {
    await target.first().scrollIntoViewIfNeeded();
  }).toPass({ timeout: ELEMENT_TIMEOUT });
  await expect(target.first()).toBeVisible({ timeout: ELEMENT_TIMEOUT });
}
