import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { EventService } from "@/services/event.service.js";

/**
 * Event service plugin
 * Creates an EventService instance and decorates it on the Fastify instance
 */
export default fp(
  async function eventServicePlugin(fastify: FastifyInstance) {
    const eventService = new EventService(fastify.db, fastify.permissionsService);
    fastify.decorate("eventService", eventService);
  },
  {
    name: "event-service",
    dependencies: ["database", "permissions-service"],
  },
);
