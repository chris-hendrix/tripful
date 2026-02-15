import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { SchedulerService } from "@/services/scheduler.service.js";

/**
 * Scheduler service plugin
 * Creates a SchedulerService instance, starts it in non-test environments,
 * and decorates it on the Fastify instance
 */
export default fp(
  async function schedulerServicePlugin(fastify: FastifyInstance) {
    const schedulerService = new SchedulerService(
      fastify.notificationService,
      fastify.smsService,
      fastify.db,
      fastify.log,
    );

    // Only start scheduler in non-test environments
    if (fastify.config.NODE_ENV !== "test") {
      schedulerService.start();
    }

    // Clean up on server close
    fastify.addHook("onClose", () => {
      schedulerService.stop();
    });

    fastify.decorate("schedulerService", schedulerService);
  },
  {
    name: "scheduler-service",
    dependencies: ["database", "notification-service", "sms-service"],
  },
);
