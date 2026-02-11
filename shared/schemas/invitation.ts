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

// --- Response schemas ---

/** Invitation entity as returned by the API */
const invitationEntitySchema = z.object({
  id: z.string(),
  tripId: z.string(),
  inviterId: z.string(),
  inviteePhone: z.string(),
  status: z.enum(["pending", "accepted", "declined", "failed"]),
  sentAt: z.date(),
  respondedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  inviteeName: z.string().optional(),
});

/** Member with profile info (for member list and RSVP responses)
 *  Note: createdAt is pre-converted to ISO string by the service layer */
const memberWithProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string(),
  profilePhotoUrl: z.string().nullable(),
  phoneNumber: z.string().optional(),
  status: z.enum(["going", "not_going", "maybe", "no_response"]),
  isOrganizer: z.boolean(),
  createdAt: z.string(),
});

/** POST /api/trips/:tripId/invitations - Create invitations */
export const createInvitationsResponseSchema = z.object({
  success: z.literal(true),
  invitations: z.array(invitationEntitySchema),
  skipped: z.array(z.string()),
});

/** GET /api/trips/:tripId/invitations - List invitations */
export const getInvitationsResponseSchema = z.object({
  success: z.literal(true),
  invitations: z.array(invitationEntitySchema),
});

/** POST /api/trips/:tripId/rsvp - Update RSVP */
export const updateRsvpResponseSchema = z.object({
  success: z.literal(true),
  member: memberWithProfileSchema,
});

/** GET /api/trips/:tripId/members - List members */
export const getMembersResponseSchema = z.object({
  success: z.literal(true),
  members: z.array(memberWithProfileSchema),
});

// Inferred TypeScript types from schemas
export type CreateInvitationsInput = z.infer<typeof createInvitationsSchema>;
export type UpdateRsvpInput = z.infer<typeof updateRsvpSchema>;
