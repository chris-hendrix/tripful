import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { AccommodationService } from "@/services/accommodation.service.js";

/**
 * Accommodation service plugin
 * Creates an AccommodationService instance and decorates it on the Fastify instance
 */
export default fp(
  async function accommodationServicePlugin(fastify: FastifyInstance) {
    const accommodationService = new AccommodationService(
      fastify.db,
      fastify.permissionsService,
    );
    fastify.decorate("accommodationService", accommodationService);
  },
  {
    name: "accommodation-service",
    dependencies: ["database", "permissions-service"],
  },
);
