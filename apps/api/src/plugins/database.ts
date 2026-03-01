import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { db, pool } from "@/config/database.js";
import { queryLogger, instrumentPool } from "./query-logger.js";

/**
 * Database plugin
 * Decorates the Fastify instance with the Drizzle database instance.
 *
 * Pool lifecycle note: The connection pool is a module-level singleton
 * (created in config/database.ts) shared across Fastify instances.
 * Cleanup is handled by server.ts via close-with-grace to avoid
 * double-close issues in tests where multiple app instances share the pool.
 */
export default fp(
  async function databasePlugin(fastify: FastifyInstance) {
    queryLogger.setLogger(fastify.log);
    instrumentPool(pool, queryLogger);
    fastify.decorate("db", db);
  },
  {
    name: "database",
    fastify: "5.x",
    dependencies: ["config"],
  },
);
