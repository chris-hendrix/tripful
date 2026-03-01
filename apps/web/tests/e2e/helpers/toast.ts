import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TOAST_TIMEOUT } from "./timeouts";

/**
 * Force-remove all Sonner toast elements from the DOM.
 *
 * On mobile WebKit, Sonner's auto-dismiss timer gets permanently stuck
 * because Playwright mouse events don't produce real pointer events on
 * touch devices. Neither mouse.move, mouseout dispatch, nor body clicks
 * reliably unpause the timer. Removing the DOM elements is the only
 * approach that works across all browsers.
 *
 * This is safe because Sonner recreates elements for each new toast
 * independently — removing old elements doesn't corrupt React state
 * or prevent future toasts from rendering.
 */
/* eslint-disable no-undef -- browser globals inside page.evaluate */
async function forceRemoveToasts(page: Page): Promise<void> {
  await page.evaluate(() => {
    document
      .querySelectorAll("[data-sonner-toast]")
      .forEach((el) => el.remove());
  });
}
/* eslint-enable no-undef */

/**
 * Dismiss any visible Sonner toasts and wait for them to disappear.
 *
 * Strategy: try to unpause the auto-dismiss timer via mouseout dispatch
 * (works on desktop). If toasts persist after a short wait, force-remove
 * them from the DOM (needed on mobile WebKit).
 */
export async function dismissToast(page: Page): Promise<void> {
  const selector = "[data-sonner-toast]";
  if ((await page.locator(selector).count()) === 0) return;

  // Desktop: move mouse away + dispatch mouseout to unpause auto-dismiss
  await page.mouse.move(0, 0);
  /* eslint-disable no-undef -- browser globals inside page.evaluate */
  await page.evaluate(() => {
    const toaster = document.querySelector("[data-sonner-toaster]");
    if (toaster) {
      toaster.dispatchEvent(
        new MouseEvent("mouseout", {
          bubbles: true,
          relatedTarget: document.documentElement,
        }),
      );
    }
  });
  /* eslint-enable no-undef */

  // Wait for toasts to auto-dismiss. If they persist (mobile WebKit),
  // force-remove them from the DOM.
  await expect(async () => {
    await forceRemoveToasts(page);
    expect(await page.locator(selector).count()).toBe(0);
  }).toPass({ timeout: TOAST_TIMEOUT });
}
