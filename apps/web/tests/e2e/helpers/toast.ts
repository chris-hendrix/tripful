import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TOAST_TIMEOUT } from "./timeouts";

/**
 * Dismiss any visible Sonner toasts by unpauusing auto-dismiss
 * and waiting for all toasts to disappear.
 *
 * On desktop, moving the mouse away unpauses the timer. On mobile WebKit,
 * mouse.move doesn't trigger pointerleave so we also click the page body
 * to clear any touch/hover state that keeps the toast paused.
 */
export async function dismissToast(page: Page): Promise<void> {
  const selector = "[data-sonner-toast]";
  if ((await page.locator(selector).count()) === 0) return;

  // Move mouse away + click body to unpause Sonner on both desktop and mobile
  await page.mouse.move(0, 0);
  await page.locator("body").click({ position: { x: 0, y: 0 }, force: true });

  // Poll until toasts disappear. We avoid expect(locator).toHaveCount(0)
  // because it can return "undefined" in Firefox/WebKit when Sonner's toast
  // portal remounts, causing flaky failures.
  await expect(async () => {
    await page.mouse.move(0, 0);
    await page.locator("body").click({ position: { x: 0, y: 0 }, force: true });
    expect(await page.locator(selector).count()).toBe(0);
  }).toPass({ timeout: TOAST_TIMEOUT });
}
