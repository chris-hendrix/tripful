import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { AuthService } from "@/services/auth.service.js";

/**
 * Auth service plugin
 * Creates an AuthService instance with the Fastify instance (for JWT access)
 * and decorates it on the Fastify instance
 */
export default fp(
  async function authServicePlugin(fastify: FastifyInstance) {
    const authService = new AuthService(fastify);
    fastify.decorate("authService", authService);
  },
  {
    name: "auth-service",
    dependencies: ["database"],
  },
);
