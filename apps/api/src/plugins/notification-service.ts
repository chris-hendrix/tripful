import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { NotificationService } from "@/services/notification.service.js";

/**
 * Notification service plugin
 * Creates a NotificationService instance and decorates it on the Fastify instance.
 *
 * @depends database - Drizzle ORM instance for notification/preference queries
 * @depends sms-service - SMS delivery for notification alerts
 */
export default fp(
  async function notificationServicePlugin(fastify: FastifyInstance) {
    const notificationService = new NotificationService(
      fastify.db,
      fastify.smsService,
    );
    fastify.decorate("notificationService", notificationService);
  },
  {
    name: "notification-service",
    dependencies: ["database", "sms-service"],
  },
);
