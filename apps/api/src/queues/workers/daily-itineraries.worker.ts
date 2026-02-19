import type { Job } from "pg-boss";
import { and, eq, isNull } from "drizzle-orm";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { events, trips } from "@/db/schema/index.js";
import type { WorkerDeps } from "@/queues/types.js";
import { QUEUE } from "@/queues/types.js";

/**
 * Handles daily-itineraries cron jobs.
 * Queries active trips, checks if current time in trip's timezone is in the
 * morning window (7:45-8:15 AM), then enqueues a notification/batch job with
 * today's schedule for each qualifying trip.
 */
export async function handleDailyItineraries(
  _job: Job<object>,
  deps: WorkerDeps,
): Promise<void> {
  const activeTrips = await deps.db
    .select({
      id: trips.id,
      name: trips.name,
      startDate: trips.startDate,
      endDate: trips.endDate,
      preferredTimezone: trips.preferredTimezone,
    })
    .from(trips)
    .where(eq(trips.cancelled, false));

  let enqueuedCount = 0;

  for (const trip of activeTrips) {
    if (!trip.startDate || !trip.endDate) continue;

    // Check if current time in trip's timezone is in morning window
    const zonedNow = toZonedTime(new Date(), trip.preferredTimezone);
    const hour = zonedNow.getHours();
    const minute = zonedNow.getMinutes();
    const isMorning =
      (hour === 7 && minute >= 45) || (hour === 8 && minute <= 15);
    if (!isMorning) continue;

    // Check if today is within trip date range
    const todayStr = format(zonedNow, "yyyy-MM-dd");
    if (todayStr < trip.startDate || todayStr > trip.endDate) continue;

    // Query today's events for this trip
    const tripEvents = await deps.db
      .select({
        id: events.id,
        name: events.name,
        startTime: events.startTime,
      })
      .from(events)
      .where(and(eq(events.tripId, trip.id), isNull(events.deletedAt)))
      .orderBy(events.startTime);

    const todaysEvents = tripEvents.filter((event) => {
      const zonedStart = toZonedTime(event.startTime, trip.preferredTimezone);
      const eventDateStr = format(zonedStart, "yyyy-MM-dd");
      return eventDateStr === todayStr;
    });

    let body: string;
    if (todaysEvents.length === 0) {
      body = "No events scheduled for today.";
    } else {
      body = todaysEvents
        .map((event, index) => {
          const zonedStart = toZonedTime(
            event.startTime,
            trip.preferredTimezone,
          );
          const timeStr = format(zonedStart, "h:mm a");
          return `${index + 1}. ${timeStr} - ${event.name}`;
        })
        .join("\n");
    }

    const referenceId = `${trip.id}:${todayStr}`;

    await deps.boss.send(
      QUEUE.NOTIFICATION_BATCH,
      {
        tripId: trip.id,
        type: "daily_itinerary",
        title: `${trip.name} - Today's Schedule`,
        body,
        data: { tripId: trip.id, referenceId },
      },
      {
        singletonKey: `daily-itinerary:${referenceId}`,
        expireInSeconds: 900,
      },
    );
    enqueuedCount++;
  }

  deps.logger.info({ count: enqueuedCount }, "enqueued daily itinerary batches");
}
