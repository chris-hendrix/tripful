// Shared Zod validation schemas for the Tripful platform

import { z } from 'zod';

/**
 * Validates phone numbers in E.164 format
 * Format: +[country code][number] (e.g., +14155552671)
 * - Must start with '+'
 * - Country code: 1-3 digits (first digit cannot be 0)
 * - Total length: 8-15 characters after '+'
 */
export const phoneNumberSchema = z.string().regex(/^\+[1-9]\d{1,14}$/, {
  message: 'Phone number must be in E.164 format (e.g., +14155552671)',
});

/**
 * Validates email addresses using Zod's built-in email validator
 */
export const emailSchema = z.string().email({
  message: 'Invalid email address',
});

/**
 * Validates UUID strings (v4 format)
 */
export const uuidSchema = z.string().uuid({
  message: 'Invalid UUID format',
});

// Re-export authentication schemas
export {
  requestCodeSchema,
  verifyCodeSchema,
  completeProfileSchema,
  type RequestCodeInput,
  type VerifyCodeInput,
  type CompleteProfileInput,
} from './auth';
