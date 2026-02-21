import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TOAST_TIMEOUT } from "./timeouts";

/**
 * Dismiss any visible Sonner toasts by moving the mouse away
 * (to unpause auto-dismiss) and waiting for all toasts to disappear.
 */
export async function dismissToast(page: Page): Promise<void> {
  const toasts = page.locator("[data-sonner-toast]");
  // If no toast is visible, return immediately
  const count = await toasts.count();
  if (count === 0) return;

  // Move mouse away from toast area to unpause Sonner's auto-dismiss timer
  await page.mouse.move(0, 0);

  // Wait for all toasts to auto-dismiss
  await expect(toasts).toHaveCount(0, { timeout: TOAST_TIMEOUT });
}
