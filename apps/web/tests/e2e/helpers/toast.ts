/* global document */
import type { Page } from "@playwright/test";
import { TOAST_TIMEOUT } from "./timeouts";

/**
 * Dismiss any visible Sonner toast so it does not intercept subsequent clicks.
 *
 * Uses a three-tier approach for reliability:
 * 1. Click the toast close button (fastest, most deterministic)
 * 2. Dispatch mouseleave on the toaster to unpause auto-dismiss timer, then wait
 * 3. Force-remove the toast DOM element as a last resort
 */
export async function dismissToast(page: Page): Promise<void> {
  const toast = page.locator("[data-sonner-toast]").first();
  if (!(await toast.isVisible().catch(() => false))) return;

  // Tier 1: Click the close button rendered by Sonner (closeButton prop)
  const closeBtn = toast.locator("[data-close-button]");
  if (await closeBtn.isVisible().catch(() => false)) {
    try {
      await closeBtn.click({ timeout: 2000 });
      await toast.waitFor({ state: "hidden", timeout: 2000 }).catch(() => {});
      if (!(await toast.isVisible().catch(() => false))) return;
    } catch {
      // Close button click may fail if a dialog/sheet intercepts pointer events
    }
  }

  // Tier 2: Dispatch mouseleave to unpause auto-dismiss timer and wait
  await page.locator("[data-sonner-toaster]").dispatchEvent("mouseleave");
  await toast.waitFor({ state: "hidden", timeout: TOAST_TIMEOUT }).catch(() => {});
  if (!(await toast.isVisible().catch(() => false))) return;

  // Tier 3: Force-remove all toast DOM elements as last resort
  await page.evaluate(() => {
    document.querySelectorAll("[data-sonner-toast]").forEach((el) => el.remove());
  });
}
