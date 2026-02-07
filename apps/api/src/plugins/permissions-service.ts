import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { PermissionsService } from "@/services/permissions.service.js";

/**
 * Permissions service plugin
 * Creates a PermissionsService instance and decorates it on the Fastify instance
 */
export default fp(
  async function permissionsServicePlugin(fastify: FastifyInstance) {
    const permissionsService = new PermissionsService();
    fastify.decorate("permissionsService", permissionsService);
  },
  {
    name: "permissions-service",
    dependencies: ["database"],
  },
);
