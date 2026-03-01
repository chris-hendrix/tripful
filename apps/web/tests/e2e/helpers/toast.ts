import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TOAST_TIMEOUT } from "./timeouts";

/**
 * Dismiss any visible Sonner toasts and wait for them to disappear.
 *
 * Primary approach: call Sonner's `toast.dismiss()` API directly via a
 * window global exposed by the `<Toaster>` component. This bypasses
 * all mouse-event / timer issues and works reliably on every browser.
 *
 * Fallback: dispatch a native `mouseout` event on the toaster container
 * to unpause the auto-dismiss timer (works on desktop, unreliable on
 * mobile WebKit where Playwright mouse events don't produce real pointer
 * events on touch devices).
 */
export async function dismissToast(page: Page): Promise<void> {
  const selector = "[data-sonner-toast]";
  if ((await page.locator(selector).count()) === 0) return;

  // Primary: call Sonner's dismiss() API directly (all browsers)
  /* eslint-disable no-undef -- browser globals inside page.evaluate */
  await page.evaluate(() => {
    const win = window as unknown as Record<string, unknown>;
    if (typeof win.__e2eDismissToasts === "function") {
      (win.__e2eDismissToasts as () => void)();
    }
  });
  /* eslint-enable no-undef */

  // Fallback: also unpause auto-dismiss timer via mouseout
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

  // Wait for toast exit animations to complete
  await expect(async () => {
    // Re-dismiss in case new toasts appeared during the wait
    /* eslint-disable no-undef -- browser globals inside page.evaluate */
    await page.evaluate(() => {
      const win = window as unknown as Record<string, unknown>;
      if (typeof win.__e2eDismissToasts === "function") {
        (win.__e2eDismissToasts as () => void)();
      }
    });
    /* eslint-enable no-undef */
    expect(await page.locator(selector).count()).toBe(0);
  }).toPass({ timeout: TOAST_TIMEOUT });
}
