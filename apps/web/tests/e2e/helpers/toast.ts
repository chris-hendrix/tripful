import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TOAST_TIMEOUT } from "./timeouts";

/**
 * Dismiss any visible Sonner toasts by unpausing auto-dismiss
 * and waiting for all toasts to disappear.
 *
 * Sonner pauses its auto-dismiss timer on `onMouseEnter` of the toaster
 * `<ol>` container and resumes on `onMouseLeave`. React implements these
 * via native `mouseout`/`mouseover` events through its delegation system.
 *
 * On desktop, `page.mouse.move(0,0)` naturally triggers mouseleave. On
 * mobile WebKit, mouse events from Playwright don't produce real browser
 * pointer events (touch devices have no persistent pointer), so the timer
 * stays paused forever once accidentally triggered by a prior click action.
 *
 * The fix: dispatch a native `mouseout` event on the `[data-sonner-toaster]`
 * container with `relatedTarget` set outside it. React's event delegation
 * picks this up and fires Sonner's `onMouseLeave`, unpausing the timer.
 */
export async function dismissToast(page: Page): Promise<void> {
  const selector = "[data-sonner-toast]";
  if ((await page.locator(selector).count()) === 0) return;

  const unpauseToasts = async () => {
    // Desktop: move mouse away from toast area
    await page.mouse.move(0, 0);
    // All browsers: dispatch mouseout on the Sonner toaster container.
    // React's root-level listener translates this to onMouseLeave when
    // relatedTarget is outside the container, unpausing auto-dismiss.
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
  };

  await unpauseToasts();

  // Poll until toasts disappear. We avoid expect(locator).toHaveCount(0)
  // because it can return "undefined" in Firefox/WebKit when Sonner's toast
  // portal remounts, causing flaky failures.
  await expect(async () => {
    await unpauseToasts();
    expect(await page.locator(selector).count()).toBe(0);
  }).toPass({ timeout: TOAST_TIMEOUT });
}
