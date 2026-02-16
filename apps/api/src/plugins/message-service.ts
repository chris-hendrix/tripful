import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { MessageService } from "@/services/message.service.js";

/**
 * Message service plugin
 * Creates a MessageService instance and decorates it on the Fastify instance
 */
export default fp(
  async function messageServicePlugin(fastify: FastifyInstance) {
    const messageService = new MessageService(
      fastify.db,
      fastify.permissionsService,
      fastify.notificationService,
      fastify.log,
    );
    fastify.decorate("messageService", messageService);
  },
  {
    name: "message-service",
    dependencies: ["database", "permissions-service", "notification-service"],
  },
);
