import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { HealthService } from "@/services/health.service.js";
import { testConnection } from "@/config/database.js";

/**
 * Health service plugin
 * Decorates the Fastify instance with the health service
 */
export default fp(
  async function healthServicePlugin(fastify: FastifyInstance) {
    const healthService = new HealthService(testConnection);
    fastify.decorate("healthService", healthService);
  },
  {
    name: "health-service",
    dependencies: ["database"],
  },
);
