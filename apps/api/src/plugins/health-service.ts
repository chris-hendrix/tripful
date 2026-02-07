import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { healthService } from "@/services/health.service.js";

/**
 * Health service plugin
 * Decorates the Fastify instance with the health service
 */
export default fp(
  async function healthServicePlugin(fastify: FastifyInstance) {
    fastify.decorate("healthService", healthService);
  },
  {
    name: "health-service",
    dependencies: ["database"],
  },
);
