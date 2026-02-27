import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TOAST_TIMEOUT } from "./timeouts";

/**
 * Dismiss any visible Sonner toasts by moving the mouse away
 * (to unpause auto-dismiss) and waiting for all toasts to disappear.
 */
export async function dismissToast(page: Page): Promise<void> {
  const selector = "[data-sonner-toast]";
  if ((await page.locator(selector).count()) === 0) return;

  // Move mouse away from toast area to unpause Sonner's auto-dismiss timer
  await page.mouse.move(0, 0);

  // Poll until toasts disappear. We avoid expect(locator).toHaveCount(0)
  // because it can return "undefined" in Firefox/WebKit when Sonner's toast
  // portal remounts, causing flaky failures.
  await expect(async () => {
    await page.mouse.move(0, 0);
    expect(await page.locator(selector).count()).toBe(0);
  }).toPass({ timeout: TOAST_TIMEOUT });
}
