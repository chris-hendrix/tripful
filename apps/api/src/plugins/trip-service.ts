import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { TripService } from "@/services/trip.service.js";

/**
 * Trip service plugin
 * Creates a TripService instance and decorates it on the Fastify instance
 */
export default fp(
  async function tripServicePlugin(fastify: FastifyInstance) {
    const tripService = new TripService();
    fastify.decorate("tripService", tripService);
  },
  {
    name: "trip-service",
    dependencies: ["database", "permissions-service"],
  },
);
