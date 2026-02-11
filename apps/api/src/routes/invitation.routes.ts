import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { invitationController } from "@/controllers/invitation.controller.js";
import {
  authenticate,
  requireCompleteProfile,
} from "@/middleware/auth.middleware.js";
import {
  defaultRateLimitConfig,
  writeRateLimitConfig,
} from "@/middleware/rate-limit.middleware.js";
import {
  createInvitationsSchema,
  updateRsvpSchema,
  createInvitationsResponseSchema,
  getInvitationsResponseSchema,
  getMembersResponseSchema,
  updateRsvpResponseSchema,
  successResponseSchema,
} from "@tripful/shared/schemas";
import type {
  CreateInvitationsInput,
  UpdateRsvpInput,
} from "@tripful/shared/schemas";

// Reusable param schemas
const tripIdParamsSchema = z.object({
  tripId: z.string().uuid({ message: "Invalid trip ID format" }),
});

const invitationIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid invitation ID format" }),
});

/**
 * Invitation Routes
 * Registers all invitation and RSVP-related endpoints
 *
 * Read-only routes (GET) require authentication only.
 * Write routes (POST/DELETE) require authentication and complete profile,
 * applied via a scoped plugin with shared preHandler hooks.
 *
 * @param fastify - Fastify instance
 */
export async function invitationRoutes(fastify: FastifyInstance) {
  /**
   * GET /trips/:tripId/invitations
   * List invitations for a trip (organizer only)
   * Requires authentication only (not complete profile)
   */
  fastify.get<{ Params: { tripId: string } }>(
    "/trips/:tripId/invitations",
    {
      schema: {
        params: tripIdParamsSchema,
        response: { 200: getInvitationsResponseSchema },
      },
      preHandler: [authenticate, fastify.rateLimit(defaultRateLimitConfig)],
    },
    invitationController.getInvitations,
  );

  /**
   * GET /trips/:tripId/members
   * List members of a trip
   * Requires authentication only (not complete profile)
   */
  fastify.get<{ Params: { tripId: string } }>(
    "/trips/:tripId/members",
    {
      schema: {
        params: tripIdParamsSchema,
        response: { 200: getMembersResponseSchema },
      },
      preHandler: [authenticate, fastify.rateLimit(defaultRateLimitConfig)],
    },
    invitationController.getMembers,
  );

  /**
   * Write routes scope
   * All routes registered here share authenticate + requireCompleteProfile hooks
   * with stricter rate limiting for write operations
   */
  fastify.register(async (scope) => {
    scope.addHook("preHandler", authenticate);
    scope.addHook("preHandler", requireCompleteProfile);
    scope.addHook("preHandler", scope.rateLimit(writeRateLimitConfig));

    /**
     * POST /trips/:tripId/invitations
     * Create batch invitations for a trip
     */
    scope.post<{ Params: { tripId: string }; Body: CreateInvitationsInput }>(
      "/trips/:tripId/invitations",
      {
        schema: {
          params: tripIdParamsSchema,
          body: createInvitationsSchema,
          response: { 201: createInvitationsResponseSchema },
        },
      },
      invitationController.createInvitations,
    );

    /**
     * DELETE /invitations/:id
     * Revoke an invitation
     * Only organizers can revoke invitations
     */
    scope.delete<{ Params: { id: string } }>(
      "/invitations/:id",
      {
        schema: {
          params: invitationIdParamsSchema,
          response: { 200: successResponseSchema },
        },
      },
      invitationController.revokeInvitation,
    );

    /**
     * POST /trips/:tripId/rsvp
     * Update RSVP status for a trip
     */
    scope.post<{ Params: { tripId: string }; Body: UpdateRsvpInput }>(
      "/trips/:tripId/rsvp",
      {
        schema: {
          params: tripIdParamsSchema,
          body: updateRsvpSchema,
          response: { 200: updateRsvpResponseSchema },
        },
      },
      invitationController.updateRsvp,
    );
  });
}
