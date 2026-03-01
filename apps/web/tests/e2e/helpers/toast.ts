import type { Page } from "@playwright/test";

/**
 * Hide Sonner toast elements so they don't intercept clicks.
 *
 * On mobile WebKit, Sonner's auto-dismiss timer gets permanently stuck
 * because Playwright mouse events don't produce real pointer events on
 * touch devices. Neither mouse.move, mouseout dispatch, nor body clicks
 * reliably unpause the timer.
 *
 * We hide the toaster container (pointer-events:none + opacity:0) instead
 * of removing individual toast elements. Removing DOM elements that React
 * still tracks corrupts the fiber tree — on WebKit this throws
 * NotFoundError ("The object can not be found here") during the commit
 * phase when React tries to unmount the already-removed nodes.
 */
/* eslint-disable no-undef -- browser globals inside page.evaluate */
async function hideToasts(page: Page): Promise<void> {
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLElement>("[data-sonner-toaster]")
      .forEach((el) => {
        el.style.pointerEvents = "none";
        el.style.opacity = "0";
      });
  });
}
/* eslint-enable no-undef */

/**
 * Dismiss any visible Sonner toasts so they don't intercept clicks.
 *
 * Strategy: try to unpause the auto-dismiss timer via mouseout dispatch
 * (works on desktop). Then hide the toaster container to prevent
 * click interception (needed on mobile WebKit where timers stick).
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

  // Hide toasts so they can't intercept subsequent clicks.
  // The toaster container gets pointer-events:none + opacity:0.
  // Sonner restores styles when it renders the next toast.
  await hideToasts(page);

  // Brief pause for any in-flight toast animations to settle
  await page.waitForTimeout(200);
}
