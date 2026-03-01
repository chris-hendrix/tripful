import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { dismissToast } from "./toast";
import { pickDateTime } from "./date-pickers";
import { PROBE_TIMEOUT, RETRY_INTERVAL, ELEMENT_TIMEOUT } from "./timeouts";

/** Quick-dismiss any toasts via Sonner API without waiting for exit animation. */
async function quickDismiss(page: Page): Promise<void> {
  /* eslint-disable no-undef -- browser globals inside page.evaluate */
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    if (typeof w.__e2eDismissToasts === "function") {
      (w.__e2eDismissToasts as () => void)();
    }
  });
  /* eslint-enable no-undef */
}

/** Helper: open the FAB dropdown and click a menu item, or fall back to empty-state button. */
export async function clickFabAction(page: Page, actionName: string) {
  // Dismiss any Sonner toast so it doesn't intercept the click.
  await dismissToast(page);

  const fab = page.getByRole("button", { name: "Add to itinerary" });
  if (await fab.isVisible({ timeout: PROBE_TIMEOUT }).catch(() => false)) {
    // Retry: a late-arriving success toast from the previous action can
    // appear after dismissToast returns and intercept the FAB click.
    // Quick-dismiss on each attempt to clear any new toasts.
    await expect(async () => {
      await quickDismiss(page);
      await fab.click({ timeout: RETRY_INTERVAL });
    }).toPass({ timeout: ELEMENT_TIMEOUT });
    await page.getByRole("menuitem", { name: actionName }).click();
  } else {
    // Empty state has direct buttons like "Add Event", "Add Accommodation"
    await page.getByRole("button", { name: `Add ${actionName}` }).click();
  }
}

/** Helper: create an event via the UI (assumes on trip detail page). */
export async function createEvent(
  page: Page,
  name: string,
  startDateTime: string,
  options?: {
    type?: string;
    location?: string;
    description?: string;
    endDateTime?: string;
  },
) {
  await clickFabAction(page, "Event");
  await expect(
    page.getByRole("heading", { name: "Create a new event" }),
  ).toBeVisible();

  await page.getByLabel(/event name/i).fill(name);

  if (options?.description) {
    await page.getByLabel(/description/i).fill(options.description);
  }

  if (options?.type) {
    const dialog = page.getByRole("dialog");
    await dialog.locator('button[role="combobox"]').first().click();
    await page
      .locator(`div[role="option"]`)
      .filter({ hasText: options.type })
      .click();
  }

  if (options?.location) {
    await page.locator('input[name="location"]').fill(options.location);
  }

  const startTrigger = page.getByRole("button", { name: "Start time" });
  await pickDateTime(page, startTrigger, startDateTime);

  if (options?.endDateTime) {
    const endTrigger = page.getByRole("button", { name: "End time" });
    await pickDateTime(page, endTrigger, options.endDateTime);
  }

  await page.getByRole("button", { name: "Create event" }).click();
}
