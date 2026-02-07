import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { env } from "@/config/env.js";

/**
 * Config plugin
 * Decorates the Fastify instance with the validated environment config
 */
export default fp(
  async function configPlugin(fastify: FastifyInstance) {
    fastify.decorate("config", env);
  },
  {
    name: "config",
  },
);
