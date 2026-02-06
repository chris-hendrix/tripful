import type { FastifyRequest, FastifyReply } from "fastify";
import { createTripSchema, uuidSchema } from "@tripful/shared/schemas";
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
        { error, userId: request.user.sub, tripId: (request.params as { id: string }).id },
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
};
