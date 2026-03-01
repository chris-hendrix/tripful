import type { Locator } from "@playwright/test";

/**
 * Reliably fill a react-phone-number-input field.
 *
 * react-phone-number-input uses the `input-format` library with smart caret
 * positioning, which processes input character-by-character. Playwright's
 * `fill()` sets the value in one shot (like a paste), which desynchronizes
 * input-format's internal state from react-hook-form — especially on
 * iPhone WebKit where event timing differs. The form then silently rejects
 * submission because react-hook-form never received the phone value.
 *
 * This helper types digits one-by-one via `pressSequentially()`, matching
 * the component's expected input model.
 *
 * @param phoneInput - Locator for the phone text input
 * @param phone - E.164 phone number (e.g. "+15551234567")
 */
export async function fillPhoneInput(
  phoneInput: Locator,
  phone: string,
): Promise<void> {
  // The component is in international mode with defaultCountry="US",
  // so the "+1" prefix is already displayed. Type only national digits.
  const digits = phone.replace(/^\+1/, "");

  await phoneInput.click();
  await phoneInput.clear();
  await phoneInput.pressSequentially(digits, { delay: 50 });
}
