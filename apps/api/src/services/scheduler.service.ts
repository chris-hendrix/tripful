import { eq, and, isNull, gte, lte } from "drizzle-orm";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import {
  events,
  trips,
  members,
  users,
  notificationPreferences,
  sentReminders,
} from "@/db/schema/index.js";
import type { AppDatabase } from "@/types/index.js";
import type { INotificationService } from "@/services/notification.service.js";
import type { Logger } from "@/types/logger.js";

/**
 * Scheduler Service Interface
 * Defines the contract for scheduled notification processing
 */
export interface ISchedulerService {
  start(): void;
  stop(): void;
  processEventReminders(): Promise<void>;
  processDailyItineraries(): Promise<void>;
}

/**
 * Scheduler Service Implementation
 * Handles periodic event reminders and daily itinerary notifications
 */
export class SchedulerService implements ISchedulerService {
  private eventReminderTimer: ReturnType<typeof setInterval> | null = null;
  private dailyItineraryTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private notificationService: INotificationService,
    private db: AppDatabase,
    private logger?: Logger,
  ) {}

  /**
   * Starts the scheduler with two periodic timers:
   * - Event reminders: every 5 minutes
   * - Daily itineraries: every 15 minutes
   * Also runs both processors immediately on start
   */
  start(): void {
    // Run immediately on start
    this.processEventReminders().catch((err) => {
      this.logger?.error(err, "Error processing event reminders on start");
    });
    this.processDailyItineraries().catch((err) => {
      this.logger?.error(err, "Error processing daily itineraries on start");
    });

    // Set up interval timers
    this.eventReminderTimer = setInterval(() => {
      this.processEventReminders().catch((err) => {
        this.logger?.error(err, "Error processing event reminders");
      });
    }, 300000); // 5 minutes

    this.dailyItineraryTimer = setInterval(() => {
      this.processDailyItineraries().catch((err) => {
        this.logger?.error(err, "Error processing daily itineraries");
      });
    }, 900000); // 15 minutes
  }

  /**
   * Stops both scheduler timers
   */
  stop(): void {
    if (this.eventReminderTimer) {
      clearInterval(this.eventReminderTimer);
      this.eventReminderTimer = null;
    }
    if (this.dailyItineraryTimer) {
      clearInterval(this.dailyItineraryTimer);
      this.dailyItineraryTimer = null;
    }
  }

  /**
   * Processes event reminders for events starting in approximately 1 hour.
   * Finds events in the 55-65 minute window, checks user preferences and
   * deduplication records, then creates notifications for eligible members.
   */
  async processEventReminders(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);

    // Query events starting in the reminder window
    const upcomingEvents = await this.db
      .select({
        id: events.id,
        name: events.name,
        location: events.location,
        tripId: events.tripId,
        startTime: events.startTime,
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

    for (const event of upcomingEvents) {
      // Get trip name
      const [trip] = await this.db
        .select({ name: trips.name })
        .from(trips)
        .where(eq(trips.id, event.tripId))
        .limit(1);

      if (!trip) continue;

      // Get going members of this trip
      const goingMembers = await this.db
        .select({
          userId: members.userId,
        })
        .from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(
          and(eq(members.tripId, event.tripId), eq(members.status, "going")),
        );

      for (const member of goingMembers) {
        try {
          // Check notification preferences
          const prefs = await this.getEventReminderPreference(
            member.userId,
            event.tripId,
          );
          if (!prefs) continue;

          // Check dedup
          const alreadySent = await this.isReminderSent(
            "event_reminder",
            event.id,
            member.userId,
          );
          if (alreadySent) continue;

          // Create notification
          const body = `${event.name} starts in 1 hour${event.location ? " at " + event.location : ""}`;
          await this.notificationService.createNotification({
            userId: member.userId,
            tripId: event.tripId,
            type: "event_reminder",
            title: trip.name,
            body,
            data: { eventId: event.id },
          });

          // Record sent reminder (dedup)
          await this.db
            .insert(sentReminders)
            .values({
              type: "event_reminder",
              referenceId: event.id,
              userId: member.userId,
            })
            .onConflictDoNothing();
        } catch (err) {
          this.logger?.error(
            err,
            `Error processing event reminder for user ${member.userId}, event ${event.id}`,
          );
        }
      }
    }
  }

  /**
   * Processes daily itinerary notifications for active trips.
   * Checks if the current time in the trip's timezone falls within the
   * 7:45-8:15 AM morning window, then sends itinerary summaries.
   */
  async processDailyItineraries(): Promise<void> {
    // Query active trips with date ranges
    const activeTrips = await this.db
      .select({
        id: trips.id,
        name: trips.name,
        startDate: trips.startDate,
        endDate: trips.endDate,
        preferredTimezone: trips.preferredTimezone,
      })
      .from(trips)
      .where(eq(trips.cancelled, false));

    for (const trip of activeTrips) {
      if (!trip.startDate || !trip.endDate) continue;

      try {
        // Check if current time is in the 7:45-8:15 AM window for this trip's timezone
        const zonedNow = toZonedTime(new Date(), trip.preferredTimezone);
        const hour = zonedNow.getHours();
        const minute = zonedNow.getMinutes();
        const isMorning =
          (hour === 7 && minute >= 45) || (hour === 8 && minute <= 15);

        if (!isMorning) continue;

        // Check if today (in trip timezone) falls within trip date range
        const todayStr = format(zonedNow, "yyyy-MM-dd");
        if (todayStr < trip.startDate || todayStr > trip.endDate) continue;

        // Build referenceId for dedup
        const referenceId = `${trip.id}:${todayStr}`;

        // Get going members with dailyItinerary preference enabled
        const goingMembers = await this.db
          .select({
            userId: members.userId,
          })
          .from(members)
          .innerJoin(users, eq(members.userId, users.id))
          .where(
            and(eq(members.tripId, trip.id), eq(members.status, "going")),
          );

        // Get today's events for this trip (in trip timezone)
        // Fetch all non-deleted events and filter by date in the trip's timezone
        const tripEvents = await this.db
          .select({
            id: events.id,
            name: events.name,
            startTime: events.startTime,
          })
          .from(events)
          .where(
            and(
              eq(events.tripId, trip.id),
              isNull(events.deletedAt),
            ),
          )
          .orderBy(events.startTime);

        // Filter events to those that fall on "today" in the trip's timezone
        const todaysEvents = tripEvents.filter((event) => {
          const zonedStart = toZonedTime(event.startTime, trip.preferredTimezone);
          const eventDateStr = format(zonedStart, "yyyy-MM-dd");
          return eventDateStr === todayStr;
        });

        // Build notification body
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

        for (const member of goingMembers) {
          try {
            // Check dailyItinerary preference
            const prefEnabled = await this.getDailyItineraryPreference(
              member.userId,
              trip.id,
            );
            if (!prefEnabled) continue;

            // Check dedup
            const alreadySent = await this.isReminderSent(
              "daily_itinerary",
              referenceId,
              member.userId,
            );
            if (alreadySent) continue;

            // Create notification
            await this.notificationService.createNotification({
              userId: member.userId,
              tripId: trip.id,
              type: "daily_itinerary",
              title: `${trip.name} - Today's Schedule`,
              body,
              data: { tripId: trip.id },
            });

            // Record sent reminder (dedup)
            await this.db
              .insert(sentReminders)
              .values({
                type: "daily_itinerary",
                referenceId,
                userId: member.userId,
              })
              .onConflictDoNothing();
          } catch (err) {
            this.logger?.error(
              err,
              `Error processing daily itinerary for user ${member.userId}, trip ${trip.id}`,
            );
          }
        }
      } catch (err) {
        this.logger?.error(
          err,
          `Error processing daily itinerary for trip ${trip.id}`,
        );
      }
    }
  }

  /**
   * Checks if a user has eventReminders preference enabled for a trip.
   * Returns true if no preference row exists (defaults to true).
   */
  private async getEventReminderPreference(
    userId: string,
    tripId: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ eventReminders: notificationPreferences.eventReminders })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.tripId, tripId),
        ),
      )
      .limit(1);

    // Default to true if no row exists
    return row ? row.eventReminders : true;
  }

  /**
   * Checks if a user has dailyItinerary preference enabled for a trip.
   * Returns true if no preference row exists (defaults to true).
   */
  private async getDailyItineraryPreference(
    userId: string,
    tripId: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ dailyItinerary: notificationPreferences.dailyItinerary })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.tripId, tripId),
        ),
      )
      .limit(1);

    // Default to true if no row exists
    return row ? row.dailyItinerary : true;
  }

  /**
   * Checks if a reminder has already been sent (deduplication).
   */
  private async isReminderSent(
    type: string,
    referenceId: string,
    userId: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: sentReminders.id })
      .from(sentReminders)
      .where(
        and(
          eq(sentReminders.type, type),
          eq(sentReminders.referenceId, referenceId),
          eq(sentReminders.userId, userId),
        ),
      )
      .limit(1);

    return !!row;
  }
}
