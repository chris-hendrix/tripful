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
  paginationSchema,
} from "@tripful/shared/schemas";
import type {
  PaginationInput,
  CreateTripInput,
  UpdateTripInput,
  AddCoOrganizerInput,
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
 * Read-only routes (GET) require authentication only.
 * Write routes (POST/PUT/DELETE) require authentication and complete profile,
 * applied via a scoped plugin with shared preHandler hooks.
 *
 * @param fastify - Fastify instance
 */
export async function tripRoutes(fastify: FastifyInstance) {
  /**
   * GET /
   * Get user's trips
   * Requires authentication only (not complete profile)
   */
  fastify.get<{ Querystring: PaginationInput }>(
    "/",
    {
      schema: {
        querystring: paginationSchema,
      },
      preHandler: authenticate,
    },
    tripController.getUserTrips,
  );

  /**
   * GET /:id
   * Get trip by ID
   * Requires authentication only (not complete profile)
   * Returns 404 for both non-existent trips and trips user is not a member of
   */
  fastify.get<{ Params: { id: string } }>(
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
   * Write routes scope
   * All routes registered here share authenticate + requireCompleteProfile hooks
   */
  fastify.register(async (scope) => {
    scope.addHook("preHandler", authenticate);
    scope.addHook("preHandler", requireCompleteProfile);

    /**
     * POST /
     * Create a new trip
     */
    scope.post<{ Body: CreateTripInput }>(
      "/",
      {
        schema: {
          body: createTripSchema,
        },
      },
      tripController.createTrip,
    );

    /**
     * PUT /:id
     * Update trip details
     * Only organizers can update trips
     */
    scope.put<{ Params: { id: string }; Body: UpdateTripInput }>(
      "/:id",
      {
        schema: {
          params: tripIdParamsSchema,
          body: updateTripSchema,
        },
      },
      tripController.updateTrip,
    );

    /**
     * DELETE /:id
     * Cancel trip (soft delete)
     * Only organizers can cancel trips
     */
    scope.delete<{ Params: { id: string } }>(
      "/:id",
      {
        schema: {
          params: tripIdParamsSchema,
        },
      },
      tripController.cancelTrip,
    );

    /**
     * POST /:id/co-organizers
     * Add co-organizer to trip
     * Only organizers can add co-organizers
     */
    scope.post<{ Params: { id: string }; Body: AddCoOrganizerInput }>(
      "/:id/co-organizers",
      {
        schema: {
          params: tripIdParamsSchema,
          body: addCoOrganizerSchema,
        },
      },
      tripController.addCoOrganizer,
    );

    /**
     * DELETE /:id/co-organizers/:userId
     * Remove co-organizer from trip
     * Only organizers can remove co-organizers
     */
    scope.delete<{ Params: { id: string; userId: string } }>(
      "/:id/co-organizers/:userId",
      {
        schema: {
          params: removeCoOrganizerParamsSchema,
        },
      },
      tripController.removeCoOrganizer,
    );

    /**
     * POST /:id/cover-image
     * Upload cover image for trip
     * Only organizers can upload cover images
     * Note: No body schema for multipart routes
     */
    scope.post<{ Params: { id: string } }>(
      "/:id/cover-image",
      {
        schema: {
          params: tripIdParamsSchema,
        },
      },
      tripController.uploadCoverImage,
    );

    /**
     * DELETE /:id/cover-image
     * Delete cover image from trip
     * Only organizers can delete cover images
     */
    scope.delete<{ Params: { id: string } }>(
      "/:id/cover-image",
      {
        schema: {
          params: tripIdParamsSchema,
        },
      },
      tripController.deleteCoverImage,
    );
  });
}
