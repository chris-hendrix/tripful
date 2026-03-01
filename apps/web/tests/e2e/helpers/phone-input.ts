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
 * This helper types the full E.164 value (e.g. "+15551234567") one character
 * at a time via `pressSequentially()`, matching the component's expected
 * input model. The component is in international mode, so it accepts the
 * full value including "+" and country code.
 *
 * @param phoneInput - Locator for the phone text input
 * @param phone - E.164 phone number (e.g. "+15551234567")
 */
export async function fillPhoneInput(
  phoneInput: Locator,
  phone: string,
): Promise<void> {
  await phoneInput.click();
  await phoneInput.clear();
  // Type the full E.164 value — the component in international mode
  // parses the "+" and country code from the typed characters.
  await phoneInput.pressSequentially(phone, { delay: 50 });
}
