// Authentication validation schemas for the Tripful platform

import { z } from "zod";

/**
 * Validates phone number for requesting verification code
 * - Length: 10-20 characters
 * - Used for SMS-based authentication
 */
export const requestCodeSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, {
      message: "Phone number must be at least 10 characters",
    })
    .max(20, {
      message: "Phone number must not exceed 20 characters",
    }),
});

/**
 * Validates phone number and verification code for authentication
 * - Phone number: 10-20 characters
 * - Code: exactly 6 digits
 */
export const verifyCodeSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, {
      message: "Phone number must be at least 10 characters",
    })
    .max(20, {
      message: "Phone number must not exceed 20 characters",
    }),
  code: z
    .string()
    .length(6, {
      message: "Verification code must be exactly 6 characters",
    })
    .regex(/^\d{6}$/, {
      message: "Verification code must contain only digits",
    }),
});

/**
 * Validates user profile information during onboarding
 * - Display name: 3-50 characters (required)
 * - Timezone: IANA timezone string (optional)
 */
export const completeProfileSchema = z.object({
  displayName: z
    .string()
    .min(3, {
      message: "Display name must be at least 3 characters",
    })
    .max(50, {
      message: "Display name must not exceed 50 characters",
    }),
  timezone: z.string().optional(),
});

// Inferred TypeScript types from schemas
export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
