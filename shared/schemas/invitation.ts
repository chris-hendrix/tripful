// Invitation validation schemas for the Tripful platform

import { z } from "zod";
import { phoneNumberSchema } from "./phone";

/**
 * Validates batch invitation creation data
 * - phoneNumbers: array of E.164 phone numbers, min 1, max 25
 */
export const createInvitationsSchema = z.object({
  phoneNumbers: z
    .array(phoneNumberSchema)
    .min(1, {
      message: "At least one phone number is required",
    })
    .max(25, {
      message: "Cannot invite more than 25 members at once",
    }),
});

/**
 * Validates RSVP status update data
 * - status: one of "going", "not_going", "maybe"
 */
export const updateRsvpSchema = z.object({
  status: z.enum(["going", "not_going", "maybe"], {
    message: "Status must be one of: going, not_going, maybe",
  }),
});

// Inferred TypeScript types from schemas
export type CreateInvitationsInput = z.infer<typeof createInvitationsSchema>;
export type UpdateRsvpInput = z.infer<typeof updateRsvpSchema>;
