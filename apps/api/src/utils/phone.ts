// Phone number validation utilities

import { parsePhoneNumberWithError, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Validates a phone number and returns it in E.164 format
 * @param phone The phone number to validate
 * @returns Object containing validation result, E.164 format if valid, or error message
 * @example
 * // Validate a US phone number
 * validatePhoneNumber('+14155552671')
 * // Returns: { isValid: true, e164: '+14155552671' }
 *
 * // Invalid phone number
 * validatePhoneNumber('invalid')
 * // Returns: { isValid: false, error: 'Invalid phone number format' }
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  e164?: string;
  error?: string;
} {
  try {
    // In TEST_MODE, accept 555 numbers for E2E testing
    if (process.env.TEST_MODE === 'true' && phone.includes('555')) {
      // Parse to E.164 format even if not technically valid
      try {
        const parsed = parsePhoneNumberWithError(phone);
        return {
          isValid: true,
          e164: parsed.number,
        };
      } catch {
        // If parsing fails, just use the provided number
        return {
          isValid: true,
          e164: phone.startsWith('+') ? phone : `+${phone}`,
        };
      }
    }

    // First check if the phone number is valid
    if (!isValidPhoneNumber(phone)) {
      return {
        isValid: false,
        error: 'Invalid phone number format',
      };
    }

    // Parse the phone number to get E.164 format
    const parsed = parsePhoneNumberWithError(phone);

    return {
      isValid: true,
      e164: parsed.number,
    };
  } catch {
    return {
      isValid: false,
      error: 'Invalid phone number format',
    };
  }
}
