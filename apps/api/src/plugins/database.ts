import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { db } from "@/config/database.js";

/**
 * Database plugin
 * Decorates the Fastify instance with the Drizzle database instance.
 *
 * Note: Pool lifecycle (creation and cleanup) is managed by config/database.ts.
 * The server.ts handles pool cleanup via close-with-grace.
 * This plugin only decorates the Fastify instance for dependency injection.
 */
export default fp(
  async function databasePlugin(fastify: FastifyInstance) {
    fastify.decorate("db", db);
  },
  {
    name: "database",
    dependencies: ["config"],
  },
);
