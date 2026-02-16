import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { SchedulerService } from "@/services/scheduler.service.js";

/**
 * Scheduler service plugin
 * Creates a SchedulerService instance and decorates it on the Fastify instance.
 * Starts background timers for event reminders (5-min interval) and daily itineraries (15-min interval).
 * Skipped in test environment to avoid timer interference.
 *
 * @depends database - Drizzle ORM instance for event/trip/reminder queries
 * @depends notification-service - Creates and delivers scheduled notifications
 */
export default fp(
  async function schedulerServicePlugin(fastify: FastifyInstance) {
    const schedulerService = new SchedulerService(
      fastify.notificationService,
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
    dependencies: ["database", "notification-service"],
  },
);
