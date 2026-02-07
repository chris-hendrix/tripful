import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { tripController } from "@/controllers/trip.controller.js";
import {
  authenticate,
  requireCompleteProfile,
} from "@/middleware/auth.middleware.js";
import {
  createTripSchema,
  updateTripSchema,
  addCoOrganizerSchema,
} from "@tripful/shared/schemas";

// Reusable param schemas
const tripIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid trip ID format" }),
});

const removeCoOrganizerParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid ID format" }),
  userId: z.string().uuid({ message: "Invalid ID format" }),
});

/**
 * Trip Routes
 * Registers all trip-related endpoints
 *
 * @param fastify - Fastify instance
 */
export async function tripRoutes(fastify: FastifyInstance) {
  /**
   * GET /
   * Get user's trips
   * Requires authentication only (not complete profile)
   */
  fastify.get(
    "/",
    {
      preHandler: authenticate,
    },
    tripController.getUserTrips,
  );

  /**
   * POST /
   * Create a new trip
   * Requires authentication and complete profile
   */
  fastify.post(
    "/",
    {
      schema: {
        body: createTripSchema,
      },
      preHandler: [authenticate, requireCompleteProfile],
    },
    tripController.createTrip,
  );

  /**
   * GET /:id
   * Get trip by ID
   * Requires authentication only (not complete profile)
   * Returns 404 for both non-existent trips and trips user is not a member of
   */
  fastify.get(
    "/:id",
    {
      schema: {
        params: tripIdParamsSchema,
      },
      preHandler: authenticate,
    },
    tripController.getTripById,
  );

  /**
   * PUT /:id
   * Update trip details
   * Requires authentication and complete profile
   * Only organizers can update trips
   */
  fastify.put(
    "/:id",
    {
      schema: {
        params: tripIdParamsSchema,
        body: updateTripSchema,
      },
      preHandler: [authenticate, requireCompleteProfile],
    },
    tripController.updateTrip,
  );

  /**
   * DELETE /:id
   * Cancel trip (soft delete)
   * Requires authentication and complete profile
   * Only organizers can cancel trips
   */
  fastify.delete(
    "/:id",
    {
      schema: {
        params: tripIdParamsSchema,
      },
      preHandler: [authenticate, requireCompleteProfile],
    },
    tripController.cancelTrip,
  );

  /**
   * POST /:id/co-organizers
   * Add co-organizer to trip
   * Requires authentication and complete profile
   * Only organizers can add co-organizers
   */
  fastify.post(
    "/:id/co-organizers",
    {
      schema: {
        params: tripIdParamsSchema,
        body: addCoOrganizerSchema,
      },
      preHandler: [authenticate, requireCompleteProfile],
    },
    tripController.addCoOrganizer,
  );

  /**
   * DELETE /:id/co-organizers/:userId
   * Remove co-organizer from trip
   * Requires authentication and complete profile
   * Only organizers can remove co-organizers
   */
  fastify.delete(
    "/:id/co-organizers/:userId",
    {
      schema: {
        params: removeCoOrganizerParamsSchema,
      },
      preHandler: [authenticate, requireCompleteProfile],
    },
    tripController.removeCoOrganizer,
  );

  /**
   * POST /:id/cover-image
   * Upload cover image for trip
   * Requires authentication and complete profile
   * Only organizers can upload cover images
   * Note: No body schema for multipart routes
   */
  fastify.post(
    "/:id/cover-image",
    {
      schema: {
        params: tripIdParamsSchema,
      },
      preHandler: [authenticate, requireCompleteProfile],
    },
    tripController.uploadCoverImage,
  );

  /**
   * DELETE /:id/cover-image
   * Delete cover image from trip
   * Requires authentication and complete profile
   * Only organizers can delete cover images
   */
  fastify.delete(
    "/:id/cover-image",
    {
      schema: {
        params: tripIdParamsSchema,
      },
      preHandler: [authenticate, requireCompleteProfile],
    },
    tripController.deleteCoverImage,
  );
}
