import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { MutualsService } from "@/services/mutuals.service.js";

/**
 * Mutuals service plugin
 * Creates a MutualsService instance and decorates it on the Fastify instance.
 *
 * @depends database - Drizzle ORM instance for mutuals queries
 * @depends permissions-service - Permission checks for organizer-only endpoints
 */
export default fp(
  async function mutualsServicePlugin(fastify: FastifyInstance) {
    const service = new MutualsService(
      fastify.db,
      fastify.permissionsService,
      fastify.log,
    );
    fastify.decorate("mutualsService", service);
  },
  {
    name: "mutuals-service",
    fastify: "5.x",
    dependencies: ["database", "permissions-service"],
  },
);
