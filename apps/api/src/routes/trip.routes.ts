import type { FastifyInstance } from "fastify";
import { tripController } from "@/controllers/trip.controller.js";
import { authenticate, requireCompleteProfile } from "@/middleware/auth.middleware.js";

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
      preHandler: [authenticate, requireCompleteProfile],
    },
    tripController.createTrip,
  );
}
