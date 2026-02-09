// Trip validation schemas for the Tripful platform

import { z } from "zod";
import { phoneNumberSchema } from "./phone";

/**
 * Validates IANA timezone strings using Intl.supportedValuesOf
 * - Uses runtime validation against the list of supported timezones
 * - Examples: 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'UTC'
 * - Note: 'UTC' is manually added as it's commonly used but not in Intl list
 */
const ianaTimezones = [...Intl.supportedValuesOf("timeZone"), "UTC"];
const timezoneSchema = z.string().refine((tz) => ianaTimezones.includes(tz), {
  message: "Invalid IANA timezone identifier",
});

/**
 * Base trip data schema (without cross-field validation)
 * - Used as the foundation for both create and update schemas
 */
const baseTripSchema = z.object({
  name: z
    .string()
    .min(3, {
      message: "Trip name must be at least 3 characters",
    })
    .max(100, {
      message: "Trip name must not exceed 100 characters",
    }),
  destination: z.string().min(1, {
    message: "Destination is required",
  }),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  timezone: timezoneSchema,
  description: z
    .string()
    .max(2000, {
      message: "Description must not exceed 2000 characters",
    })
    .optional(),
  coverImageUrl: z
    .string()
    .refine(
      (val) => {
        // Allow paths starting with / (but not protocol-relative URLs like //example.com)
        if (val.startsWith("/") && !val.startsWith("//")) return true;
        // Require full URLs with protocol (http:// or https://)
        try {
          const url = new URL(val);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      },
      {
        message:
          "Cover image must be a valid URL with protocol (http:// or https://) or a path starting with /",
      },
    )
    .nullable()
    .optional(),
  allowMembersToAddEvents: z.boolean().default(true),
  coOrganizerPhones: z.array(phoneNumberSchema).optional(),
});

/**
 * Validates trip creation data
 * - name: 3-100 characters (required)
 * - destination: 1+ characters (required)
 * - startDate: optional ISO date string (YYYY-MM-DD)
 * - endDate: optional ISO date string (YYYY-MM-DD), must be >= startDate
 * - timezone: IANA timezone string (required)
 * - description: max 2000 characters (optional)
 * - coverImageUrl: optional URL or null
 * - allowMembersToAddEvents: boolean (defaults to true)
 * - coOrganizerPhones: array of E.164 phone numbers (optional)
 */
export const createTripSchema = baseTripSchema.refine(
  (data) => {
    // Cross-field validation: endDate must be >= startDate
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  },
);

/**
 * Validates trip update data (all fields optional)
 * - Allows partial updates to any trip field
 * - Same validation rules as createTripSchema when fields are provided
 */
export const updateTripSchema = baseTripSchema.partial().refine(
  (data) => {
    // Cross-field validation: endDate must be >= startDate (when both provided)
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  },
);

/**
 * Validates adding a co-organizer to a trip
 * - phoneNumber: E.164 format phone number (required)
 */
export const addCoOrganizerSchema = z.object({
  phoneNumber: phoneNumberSchema,
});

/**
 * Validates pagination query parameters
 * - page: integer >= 1, defaults to 1
 * - limit: integer 1-100, defaults to 20
 * Uses z.coerce to handle string query params from URLs
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Inferred TypeScript types from schemas
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type AddCoOrganizerInput = z.infer<typeof addCoOrganizerSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
