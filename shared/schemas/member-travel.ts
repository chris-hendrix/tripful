// Member travel validation schemas for the Tripful platform

import { z } from "zod";

/**
 * Base member travel data schema
 * - Used as the foundation for both create and update schemas
 */
const baseMemberTravelSchema = z.object({
  travelType: z.enum(["arrival", "departure"], {
    message: "Travel type must be one of: arrival, departure",
  }),
  time: z.string().datetime(),
  location: z.string().optional(),
  details: z
    .string()
    .max(500, {
      message: "Details must not exceed 500 characters",
    })
    .optional(),
});

/**
 * Validates member travel creation data
 * - travelType: one of "arrival", "departure" (required)
 * - time: ISO 8601 datetime string (required)
 * - location: string (optional)
 * - details: max 500 characters (optional)
 */
export const createMemberTravelSchema = baseMemberTravelSchema;

/**
 * Validates member travel update data (all fields optional)
 * - Allows partial updates to any member travel field
 * - Same validation rules as createMemberTravelSchema when fields are provided
 */
export const updateMemberTravelSchema = baseMemberTravelSchema.partial();

// Inferred TypeScript types from schemas
export type CreateMemberTravelInput = z.infer<typeof createMemberTravelSchema>;
export type UpdateMemberTravelInput = z.infer<typeof updateMemberTravelSchema>;
