import type { FastifyRequest, FastifyReply } from "fastify";
import {
  createTripSchema,
  updateTripSchema,
  uuidSchema,
  addCoOrganizerSchema,
} from "@tripful/shared/schemas";
import { tripService } from "@/services/trip.service.js";

/**
 * Trip Controller
 * Handles trip-related HTTP requests
 */
export const tripController = {
  /**
   * Create trip endpoint
   * Creates a new trip with the authenticated user as creator
   * Optionally adds co-organizers to the trip
   *
   * @route POST /api/trips
   * @middleware authenticate, requireCompleteProfile
   * @param request - Fastify request with trip data in body
   * @param reply - Fastify reply object
   * @returns Success response with created trip
   */
  async createTrip(request: FastifyRequest, reply: FastifyReply) {
    // Validate request body with Zod schema
    const result = createTripSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: result.error.issues,
        },
      });
    }

    const data = result.data;

    try {
      // Get userId from authenticated user (populated by authenticate middleware)
      const userId = request.user.sub;

      // Create trip via service
      const trip = await tripService.createTrip(userId, data);

      // Return success response with 201 status
      return reply.status(201).send({
        success: true,
        trip,
      });
    } catch (error) {
      // Handle specific errors from service
      if (error instanceof Error) {
        // Co-organizer not found error
        if (error.message.startsWith("Co-organizer not found:")) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "CO_ORGANIZER_NOT_FOUND",
              message: error.message,
            },
          });
        }

        // Member limit exceeded error
        if (error.message.startsWith("Member limit exceeded:")) {
          return reply.status(409).send({
            success: false,
            error: {
              code: "MEMBER_LIMIT_EXCEEDED",
              message: error.message,
            },
          });
        }
      }

      // Log error for debugging
      request.log.error(
        { error, userId: request.user.sub },
        "Failed to create trip",
      );

      // Return generic error response
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create trip",
        },
      });
    }
  },

  /**
   * Get user trips endpoint
   * Returns trip summaries for the authenticated user's dashboard
   *
   * @route GET /api/trips
   * @middleware authenticate
   * @param request - Fastify request
   * @param reply - Fastify reply object
   * @returns Success response with user's trips
   */
  async getUserTrips(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user.sub;
      const trips = await tripService.getUserTrips(userId);

      return reply.status(200).send({
        success: true,
        trips,
      });
    } catch (error) {
      request.log.error(
        { error, userId: request.user.sub },
        "Failed to get user trips",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get trips",
        },
      });
    }
  },

  /**
   * Get trip by ID
   * Returns trip details for members only
   */
  async getTripById(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const userId = request.user.sub;

      // Validate UUID format
      const validationResult = uuidSchema.safeParse(id);
      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid trip ID format",
          },
        });
      }

      // Get trip from service
      const trip = await tripService.getTripById(id, userId);

      // Handle null response (either not found or not authorized)
      if (!trip) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Trip not found",
          },
        });
      }

      // Return success response
      return reply.status(200).send({
        success: true,
        trip,
      });
    } catch (error) {
      request.log.error(
        {
          error,
          userId: request.user.sub,
          tripId: (request.params as { id: string }).id,
        },
        "Failed to get trip",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get trip",
        },
      });
    }
  },

  /**
   * Update trip endpoint
   * Updates an existing trip's details
   * Only organizers can update trips
   *
   * @route PUT /api/trips/:id
   * @middleware authenticate, requireCompleteProfile
   * @param request - Fastify request with trip ID in params and update data in body
   * @param reply - Fastify reply object
   * @returns Success response with updated trip
   */
  async updateTrip(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      // Extract and validate trip ID from params
      const { id } = request.params as { id: string };
      const validationResult = uuidSchema.safeParse(id);

      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid trip ID format",
          },
        });
      }

      // Validate request body
      const bodyResult = updateTripSchema.safeParse(request.body);

      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: bodyResult.error.issues,
          },
        });
      }

      // Extract user ID from JWT
      const userId = request.user.sub;

      // Call service to update trip
      const trip = await tripService.updateTrip(id, userId, bodyResult.data);

      // Return success response
      return reply.status(200).send({
        success: true,
        trip,
      });
    } catch (error) {
      // Handle known service errors
      if (error instanceof Error) {
        if (error.message === "Trip not found") {
          return reply.status(404).send({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Trip not found",
            },
          });
        }

        if (error.message.startsWith("Permission denied:")) {
          return reply.status(403).send({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: error.message,
            },
          });
        }
      }

      // Log error and return 500
      request.log.error(
        {
          error,
          userId: request.user.sub,
          tripId: (request.params as { id: string }).id,
        },
        "Failed to update trip",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update trip",
        },
      });
    }
  },

  /**
   * Cancel trip endpoint
   * Soft-deletes a trip (sets cancelled=true) if user is an organizer
   *
   * @route DELETE /api/trips/:id
   * @middleware authenticate, requireCompleteProfile
   * @param request - Fastify request with trip ID in params
   * @param reply - Fastify reply
   * @returns Success response with { success: true }
   */
  async cancelTrip(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      // Extract and validate trip ID from params
      const { id } = request.params as { id: string };
      const validationResult = uuidSchema.safeParse(id);

      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid trip ID format",
          },
        });
      }

      // Extract user ID from JWT
      const userId = request.user.sub;

      // Call service to cancel trip (soft delete)
      await tripService.cancelTrip(id, userId);

      // Return success response
      return reply.status(200).send({
        success: true,
      });
    } catch (error) {
      // Handle known service errors
      if (error instanceof Error) {
        if (error.message === "Trip not found") {
          return reply.status(404).send({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Trip not found",
            },
          });
        }

        if (error.message.startsWith("Permission denied:")) {
          return reply.status(403).send({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: error.message,
            },
          });
        }
      }

      // Log error and return 500
      request.log.error(
        {
          error,
          userId: request.user.sub,
          tripId: (request.params as { id: string }).id,
        },
        "Failed to cancel trip",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel trip",
        },
      });
    }
  },

  /**
   * Add co-organizer endpoint
   * Adds a co-organizer to a trip by phone number
   *
   * @route POST /api/trips/:id/co-organizers
   * @middleware authenticate, requireCompleteProfile
   * @param request - Fastify request with trip ID in params and phone number in body
   * @param reply - Fastify reply
   * @returns Success response with { success: true }
   */
  async addCoOrganizer(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      // Extract and validate trip ID from params
      const { id } = request.params as { id: string };
      const tripIdValidation = uuidSchema.safeParse(id);

      if (!tripIdValidation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid trip ID format",
          },
        });
      }

      // Validate request body
      const bodyValidation = addCoOrganizerSchema.safeParse(request.body);

      if (!bodyValidation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: bodyValidation.error.errors,
          },
        });
      }

      // Extract user ID from JWT
      const userId = request.user.sub;

      // Call service to add co-organizer (wrap phone in array)
      await tripService.addCoOrganizers(id, userId, [
        bodyValidation.data.phoneNumber,
      ]);

      // Return success response
      return reply.status(200).send({
        success: true,
      });
    } catch (error) {
      // Handle known service errors
      if (error instanceof Error) {
        if (error.message.startsWith("Co-organizer not found:")) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "CO_ORGANIZER_NOT_FOUND",
              message: error.message,
            },
          });
        }

        if (error.message.startsWith("Permission denied:")) {
          return reply.status(403).send({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: error.message,
            },
          });
        }

        if (error.message === "Trip not found") {
          return reply.status(404).send({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Trip not found",
            },
          });
        }

        if (error.message.startsWith("Member limit exceeded:")) {
          return reply.status(409).send({
            success: false,
            error: {
              code: "MEMBER_LIMIT_EXCEEDED",
              message: error.message,
            },
          });
        }
      }

      // Log error and return 500
      request.log.error(
        {
          error,
          userId: request.user.sub,
          tripId: (request.params as { id: string }).id,
        },
        "Failed to add co-organizer",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add co-organizer",
        },
      });
    }
  },

  /**
   * Remove co-organizer endpoint
   * Removes a co-organizer from a trip
   *
   * @route DELETE /api/trips/:id/co-organizers/:userId
   * @middleware authenticate, requireCompleteProfile
   * @param request - Fastify request with trip ID and user ID in params
   * @param reply - Fastify reply
   * @returns Success response with { success: true }
   */
  async removeCoOrganizer(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      // Extract params
      const { id, userId: coOrgUserId } = request.params as {
        id: string;
        userId: string;
      };

      // Validate trip ID
      const tripIdValidation = uuidSchema.safeParse(id);
      if (!tripIdValidation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid ID format",
          },
        });
      }

      // Validate co-organizer user ID
      const userIdValidation = uuidSchema.safeParse(coOrgUserId);
      if (!userIdValidation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid ID format",
          },
        });
      }

      // Extract requesting user ID from JWT
      const userId = request.user.sub;

      // Call service to remove co-organizer
      await tripService.removeCoOrganizer(id, userId, coOrgUserId);

      // Return success response
      return reply.status(200).send({
        success: true,
      });
    } catch (error) {
      // Handle known service errors
      if (error instanceof Error) {
        if (error.message === "Cannot remove trip creator as co-organizer") {
          return reply.status(400).send({
            success: false,
            error: {
              code: "CANNOT_REMOVE_CREATOR",
              message: error.message,
            },
          });
        }

        if (error.message.startsWith("Permission denied:")) {
          return reply.status(403).send({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: error.message,
            },
          });
        }

        if (error.message === "Trip not found") {
          return reply.status(404).send({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Trip not found",
            },
          });
        }

        if (error.message === "Co-organizer not found in trip") {
          return reply.status(404).send({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: error.message,
            },
          });
        }
      }

      // Log error and return 500
      request.log.error(
        {
          error,
          userId: request.user.sub,
          tripId: (request.params as { id: string }).id,
          coOrgUserId: (request.params as { userId: string }).userId,
        },
        "Failed to remove co-organizer",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove co-organizer",
        },
      });
    }
  },
};
