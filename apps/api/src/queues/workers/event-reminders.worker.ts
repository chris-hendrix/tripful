import type { Job } from "pg-boss";
import { and, eq, gte, isNull, lte, inArray } from "drizzle-orm";
import { events, trips } from "@/db/schema/index.js";
import type { WorkerDeps } from "@/queues/types.js";
import { QUEUE } from "@/queues/types.js";

/**
 * Handles event-reminders cron jobs.
 * Queries events starting in ~1 hour (55-65 min window),
 * then enqueues a notification/batch job per event.
 */
export async function handleEventReminders(
  _job: Job<object>,
  deps: WorkerDeps,
): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);

  const upcomingEvents = await deps.db
    .select({
      id: events.id,
      name: events.name,
      location: events.location,
      tripId: events.tripId,
    })
    .from(events)
    .where(
      and(
        gte(events.startTime, windowStart),
        lte(events.startTime, windowEnd),
        isNull(events.deletedAt),
        eq(events.allDay, false),
      ),
    );

  if (upcomingEvents.length === 0) {
    return;
  }

  // Batch query trip names for all found events (avoids N+1)
  const tripIds = [...new Set(upcomingEvents.map((e) => e.tripId))];
  const tripRows = await deps.db
    .select({ id: trips.id, name: trips.name })
    .from(trips)
    .where(inArray(trips.id, tripIds));
  const tripMap = new Map(tripRows.map((t) => [t.id, t.name]));

  for (const event of upcomingEvents) {
    const tripName = tripMap.get(event.tripId) ?? "Trip";
    const body = `${event.name} starts in 1 hour${event.location ? " at " + event.location : ""}`;

    await deps.boss.send(
      QUEUE.NOTIFICATION_BATCH,
      {
        tripId: event.tripId,
        type: "event_reminder",
        title: tripName,
        body,
        data: { eventId: event.id, referenceId: event.id },
      },
      {
        singletonKey: `event-reminder:${event.id}`,
        expireInSeconds: 300,
      },
    );
  }

  deps.logger.info(
    { count: upcomingEvents.length },
    "enqueued event reminder batches",
  );
}
