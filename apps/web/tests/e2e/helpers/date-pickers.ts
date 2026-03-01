import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Navigate the calendar to the target month/year by clicking next/prev buttons.
 */
async function navigateToMonth(
  calendar: Locator,
  targetYear: number,
  targetMonth: number,
) {
  const targetCaption = `${MONTH_NAMES[targetMonth]} ${targetYear}`;

  for (let i = 0; i < 24; i++) {
    const captionText = await calendar.getByRole("status").textContent();
    if (captionText?.trim() === targetCaption) return;

    const match = captionText?.trim().match(/^(\w+)\s+(\d{4})$/);
    if (!match) break;

    const currentMonthIdx = MONTH_NAMES.indexOf(match[1]);
    const currentYear = parseInt(match[2]);
    const diff =
      targetYear * 12 + targetMonth - (currentYear * 12 + currentMonthIdx);

    if (diff > 0) {
      await calendar.getByRole("button", { name: /next month/i }).click();
    } else if (diff < 0) {
      await calendar.getByRole("button", { name: /previous month/i }).click();
    } else {
      break;
    }
  }
}

/**
 * Pick a date using a DatePicker component (date only, no time).
 * Opens the calendar popover, navigates to the month, and clicks the day.
 *
 * @param page - Playwright Page
 * @param trigger - The DatePicker button locator
 * @param dateStr - Date string in "YYYY-MM-DD" format
 */
export async function pickDate(
  page: Page,
  trigger: Locator,
  dateStr: string,
): Promise<void> {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; // 0-indexed
  const day = parseInt(dayStr);

  await trigger.click();

  const calendar = page.locator("[data-slot='calendar']");
  await expect(calendar).toBeVisible();

  await navigateToMonth(calendar, year, month);

  // Click the day button (exclude outside days from adjacent months).
  // Use force:true — on mobile WebKit the popover entrance animation can
  // keep the calendar grid "unstable" indefinitely, blocking Playwright's
  // stability check even though the correct day is fully visible.
  await calendar
    .locator('[role="gridcell"]:not([data-outside]) button')
    .getByText(String(day), { exact: true })
    .click({ force: true });
}

/**
 * Pick a date and time using a DateTimePicker component.
 * Opens the calendar popover, navigates to the month, clicks the day,
 * fills the time input, then closes the popover.
 *
 * @param page - Playwright Page
 * @param trigger - The DateTimePicker button locator
 * @param dateTimeStr - DateTime string in "YYYY-MM-DDThh:mm" format
 */
export async function pickDateTime(
  page: Page,
  trigger: Locator,
  dateTimeStr: string,
): Promise<void> {
  const [datePart, timePart] = dateTimeStr.split("T");
  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1;
  const day = parseInt(dayStr);

  await trigger.click();

  const calendar = page.locator("[data-slot='calendar']");
  await expect(calendar).toBeVisible();

  await navigateToMonth(calendar, year, month);

  // force:true — see pickDate comment above
  await calendar
    .locator('[role="gridcell"]:not([data-outside]) button')
    .getByText(String(day), { exact: true })
    .click({ force: true });

  // Fill the time input inside the open popover
  if (timePart) {
    const timeInput = page.locator(
      "[data-slot='popover-content'] input[type='time']",
    );
    await timeInput.fill(timePart);
  }

  // Close the popover
  await page.keyboard.press("Escape");
}
