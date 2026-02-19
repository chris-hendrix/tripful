import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import {
  QUEUE,
  type WorkerDeps,
  type NotificationDeliverPayload,
  type InvitationSendPayload,
  type NotificationBatchPayload,
} from "./types.js";
import { handleNotificationDeliver } from "./workers/notification-deliver.worker.js";
import { handleInvitationSend } from "./workers/invitation-send.worker.js";
import { handleNotificationBatch } from "./workers/notification-batch.worker.js";
import { handleEventReminders } from "./workers/event-reminders.worker.js";
import { handleDailyItineraries } from "./workers/daily-itineraries.worker.js";

/**
 * Queue workers plugin
 * Creates queues, registers workers, and sets up cron schedules for pg-boss.
 * Skipped in test environment to avoid interference with test execution.
 *
 * @depends queue - pg-boss instance
 * @depends database - Drizzle ORM instance
 * @depends sms-service - SMS delivery service
 */
export default fp(
  async function queueWorkersPlugin(fastify: FastifyInstance) {
    if (fastify.config.NODE_ENV === "test") {
      fastify.log.debug("queue workers skipped in test environment");
      return;
    }

    const { boss } = fastify;

    // --- Create queues (DLQs first) ---

    await boss.createQueue(QUEUE.NOTIFICATION_DELIVER_DLQ);
    await boss.createQueue(QUEUE.NOTIFICATION_DELIVER, {
      retryLimit: 3,
      retryDelay: 10,
      retryBackoff: true,
      expireInSeconds: 300,
      deadLetter: QUEUE.NOTIFICATION_DELIVER_DLQ,
      deleteAfterSeconds: 604800,
    });

    await boss.createQueue(QUEUE.INVITATION_SEND_DLQ);
    await boss.createQueue(QUEUE.INVITATION_SEND, {
      retryLimit: 3,
      retryDelay: 10,
      retryBackoff: true,
      expireInSeconds: 300,
      deadLetter: QUEUE.INVITATION_SEND_DLQ,
      deleteAfterSeconds: 604800,
    });

    await boss.createQueue(QUEUE.NOTIFICATION_BATCH, {
      deleteAfterSeconds: 3600,
    });

    await boss.createQueue(QUEUE.EVENT_REMINDERS);
    await boss.createQueue(QUEUE.DAILY_ITINERARIES);

    // --- Cron schedules ---

    await boss.schedule(QUEUE.EVENT_REMINDERS, "*/5 * * * *");
    await boss.schedule(QUEUE.DAILY_ITINERARIES, "*/15 * * * *");

    // --- Build worker dependencies ---

    const deps: WorkerDeps = {
      db: fastify.db,
      boss: fastify.boss,
      smsService: fastify.smsService,
      logger: fastify.log,
    };

    // --- Register workers (pg-boss v12 handlers receive Job[] arrays) ---

    await boss.work<NotificationDeliverPayload>(
      QUEUE.NOTIFICATION_DELIVER,
      { localConcurrency: 3 },
      async (jobs) => {
        await handleNotificationDeliver(jobs[0]!, deps);
      },
    );

    await boss.work<InvitationSendPayload>(
      QUEUE.INVITATION_SEND,
      { localConcurrency: 3 },
      async (jobs) => {
        await handleInvitationSend(jobs[0]!, deps);
      },
    );

    await boss.work<NotificationBatchPayload>(
      QUEUE.NOTIFICATION_BATCH,
      async (jobs) => {
        await handleNotificationBatch(jobs[0]!, deps);
      },
    );

    await boss.work<object>(
      QUEUE.EVENT_REMINDERS,
      { pollingIntervalSeconds: 60 },
      async (jobs) => {
        await handleEventReminders(jobs[0]!, deps);
      },
    );

    await boss.work<object>(
      QUEUE.DAILY_ITINERARIES,
      { pollingIntervalSeconds: 60 },
      async (jobs) => {
        await handleDailyItineraries(jobs[0]!, deps);
      },
    );

    fastify.log.info("queue workers registered");
  },
  {
    name: "queue-workers",
    dependencies: ["queue", "database", "sms-service"],
  },
);
