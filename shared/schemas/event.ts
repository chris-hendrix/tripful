// Event validation schemas for the Tripful platform

import { z } from "zod";

/**
 * Base event data schema (without cross-field validation)
 * - Used as the foundation for both create and update schemas
 */
const baseEventSchema = z.object({
  name: z
    .string()
    .min(1, {
      message: "Event name must be at least 1 character",
    })
    .max(255, {
      message: "Event name must not exceed 255 characters",
    }),
  description: z
    .string()
    .max(2000, {
      message: "Description must not exceed 2000 characters",
    })
    .optional(),
  eventType: z.enum(["travel", "meal", "activity"], {
    message: "Event type must be one of: travel, meal, activity",
  }),
  location: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  allDay: z.boolean().default(false),
  isOptional: z.boolean().default(false),
  links: z
    .array(
      z.string().url({
        message: "Link must be a valid URL",
      }),
    )
    .max(10, {
      message: "Links must not exceed 10 items",
    })
    .optional(),
});

/**
 * Validates event creation data
 * - name: 1-255 characters (required)
 * - description: max 2000 characters (optional)
 * - eventType: one of "travel", "meal", "activity" (required)
 * - location: string (optional)
 * - startTime: ISO 8601 datetime string (required)
 * - endTime: ISO 8601 datetime string (optional), must be > startTime
 * - allDay: boolean (defaults to false)
 * - isOptional: boolean (defaults to false)
 * - links: array of URLs, max 10 items (optional)
 */
export const createEventSchema = baseEventSchema.refine(
  (data) => {
    // Cross-field validation: endTime must be > startTime
    if (data.endTime) {
      return new Date(data.endTime) > new Date(data.startTime);
    }
    return true;
  },
  {
    message: "End time must be after start time",
    path: ["endTime"],
  },
);

/**
 * Validates event update data (all fields optional)
 * - Allows partial updates to any event field
 * - Same validation rules as createEventSchema when fields are provided
 */
export const updateEventSchema = baseEventSchema.partial().refine(
  (data) => {
    // Cross-field validation: endTime must be > startTime (when both provided)
    if (data.startTime && data.endTime) {
      return new Date(data.endTime) > new Date(data.startTime);
    }
    return true;
  },
  {
    message: "End time must be after start time",
    path: ["endTime"],
  },
);

// Inferred TypeScript types from schemas
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
