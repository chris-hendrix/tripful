// Phone number validation utilities

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

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
    // First check if the phone number is valid
    if (!isValidPhoneNumber(phone)) {
      return {
        isValid: false,
        error: 'Invalid phone number format',
      };
    }

    // Parse the phone number to get E.164 format
    const parsed = parsePhoneNumber(phone);

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
