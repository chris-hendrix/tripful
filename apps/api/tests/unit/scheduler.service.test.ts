import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/config/database.js";
import {
  users,
  trips,
  members,
  events,
  notificationPreferences,
  sentReminders,
  notifications,
} from "@/db/schema/index.js";
import { eq, or } from "drizzle-orm";
import { SchedulerService } from "@/services/scheduler.service.js";
import { NotificationService } from "@/services/notification.service.js";
import { MockSMSService } from "@/services/sms.service.js";
import { generateUniquePhone } from "../test-utils.js";

// Create service instances for testing
const smsService = new MockSMSService();
const notificationService = new NotificationService(db, smsService);
const schedulerService = new SchedulerService(
  notificationService,
  db,
);

describe("scheduler.service", () => {
  let testOrganizerPhone: string;
  let testMemberPhone: string;
  let testMember2Phone: string;

  let testOrganizerId: string;
  let testMemberId: string;
  let testMember2Id: string;

  let testTripId: string;

  const cleanup = async () => {
    const phoneNumbers = [
      testOrganizerPhone,
      testMemberPhone,
      testMember2Phone,
    ].filter(Boolean);

    if (testTripId) {
      // Get user IDs for sentReminders cleanup
      if (phoneNumbers.length > 0) {
        const testUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(
            or(
              ...phoneNumbers.map((phone) => eq(users.phoneNumber, phone)),
            ),
          );
        for (const u of testUsers) {
          await db
            .delete(sentReminders)
            .where(eq(sentReminders.userId, u.id));
        }
      }

      await db
        .delete(notifications)
        .where(eq(notifications.tripId, testTripId));
      await db
        .delete(notificationPreferences)
        .where(eq(notificationPreferences.tripId, testTripId));
      await db.delete(events).where(eq(events.tripId, testTripId));
      await db.delete(members).where(eq(members.tripId, testTripId));
      await db.delete(trips).where(eq(trips.id, testTripId));
    }

    if (phoneNumbers.length > 0) {
      // Clean up global notifications for test users
      const testUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(
          or(...phoneNumbers.map((phone) => eq(users.phoneNumber, phone))),
        );

      for (const u of testUsers) {
        await db
          .delete(sentReminders)
          .where(eq(sentReminders.userId, u.id));
        await db
          .delete(notifications)
          .where(eq(notifications.userId, u.id));
      }

      await db
        .delete(users)
        .where(
          or(...phoneNumbers.map((phone) => eq(users.phoneNumber, phone))),
        );
    }
  };

  beforeEach(async () => {
    testOrganizerPhone = generateUniquePhone();
    testMemberPhone = generateUniquePhone();
    testMember2Phone = generateUniquePhone();

    await cleanup();

    // Create test users
    const organizerResult = await db
      .insert(users)
      .values({
        phoneNumber: testOrganizerPhone,
        displayName: "Scheduler Organizer",
        timezone: "UTC",
      })
      .returning();
    testOrganizerId = organizerResult[0].id;

    const memberResult = await db
      .insert(users)
      .values({
        phoneNumber: testMemberPhone,
        displayName: "Scheduler Member",
        timezone: "UTC",
      })
      .returning();
    testMemberId = memberResult[0].id;

    const member2Result = await db
      .insert(users)
      .values({
        phoneNumber: testMember2Phone,
        displayName: "Scheduler Member 2",
        timezone: "UTC",
      })
      .returning();
    testMember2Id = member2Result[0].id;

    // Create a test trip
    const tripResult = await db
      .insert(trips)
      .values({
        name: "Scheduler Test Trip",
        destination: "Test Destination",
        preferredTimezone: "UTC",
        createdBy: testOrganizerId,
      })
      .returning();
    testTripId = tripResult[0].id;

    // Add organizer as member with status='going'
    await db.insert(members).values({
      tripId: testTripId,
      userId: testOrganizerId,
      status: "going",
      isOrganizer: true,
    });

    // Add regular member with status='going'
    await db.insert(members).values({
      tripId: testTripId,
      userId: testMemberId,
      status: "going",
    });

    // Add second member with status='going'
    await db.insert(members).values({
      tripId: testTripId,
      userId: testMember2Id,
      status: "going",
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cleanup();
  });

  describe("processEventReminders", () => {
    it("should create notification for event starting in ~60 minutes", async () => {
      // Create event starting in 60 minutes
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(events).values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Museum Visit",
        eventType: "activity",
        startTime,
      });

      await schedulerService.processEventReminders();

      // Check notifications were created for all 3 going members
      const orgNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testOrganizerId));
      const memNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testMemberId));

      expect(orgNotifs).toHaveLength(1);
      expect(orgNotifs[0].type).toBe("event_reminder");
      expect(orgNotifs[0].title).toBe("Scheduler Test Trip");
      expect(orgNotifs[0].body).toBe("Museum Visit starts in 1 hour");
      expect(memNotifs).toHaveLength(1);
    });

    it("should NOT create notification for event outside the 55-65 min window", async () => {
      // Create event starting in 30 minutes (too soon)
      const tooSoon = new Date(Date.now() + 30 * 60 * 1000);
      await db.insert(events).values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Too Soon Event",
        eventType: "activity",
        startTime: tooSoon,
      });

      // Create event starting in 2 hours (too late)
      const tooLate = new Date(Date.now() + 120 * 60 * 1000);
      await db.insert(events).values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Too Late Event",
        eventType: "activity",
        startTime: tooLate,
      });

      await schedulerService.processEventReminders();

      const allNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.tripId, testTripId));
      expect(allNotifs).toHaveLength(0);
    });

    it("should deduplicate: second call does not create duplicate notification", async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(events).values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Dedup Event",
        eventType: "activity",
        startTime,
      });

      await schedulerService.processEventReminders();
      await schedulerService.processEventReminders();

      // Each member should have exactly 1 notification, not 2
      const memNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testMemberId));
      expect(memNotifs).toHaveLength(1);
    });

    it("should respect eventReminders=false preference", async () => {
      // Disable event reminders for testMemberId
      await db
        .insert(notificationPreferences)
        .values({
          userId: testMemberId,
          tripId: testTripId,
          eventReminders: false,
          dailyItinerary: true,
          tripMessages: true,
        })
        .onConflictDoNothing();

      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(events).values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Pref Test Event",
        eventType: "activity",
        startTime,
      });

      await schedulerService.processEventReminders();

      // testMemberId should NOT have a notification
      const memNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testMemberId));
      expect(memNotifs).toHaveLength(0);

      // organizer should still have a notification (default prefs = true)
      const orgNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testOrganizerId));
      expect(orgNotifs).toHaveLength(1);
    });

    it("should only notify going members, not maybe or not_going", async () => {
      // Change member2 to 'maybe'
      await db
        .update(members)
        .set({ status: "maybe" })
        .where(eq(members.userId, testMember2Id));

      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(events).values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Going Only Event",
        eventType: "activity",
        startTime,
      });

      await schedulerService.processEventReminders();

      // member2 should NOT have a notification
      const mem2Notifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testMember2Id));
      expect(mem2Notifs).toHaveLength(0);

      // organizer and member should have notifications
      const orgNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testOrganizerId));
      expect(orgNotifs).toHaveLength(1);
    });

    it("should skip deleted events", async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(events).values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Deleted Event",
        eventType: "activity",
        startTime,
        deletedAt: new Date(),
        deletedBy: testOrganizerId,
      });

      await schedulerService.processEventReminders();

      const allNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.tripId, testTripId));
      expect(allNotifs).toHaveLength(0);
    });

    it("should skip all-day events", async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(events).values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "All Day Event",
        eventType: "activity",
        startTime,
        allDay: true,
      });

      await schedulerService.processEventReminders();

      const allNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.tripId, testTripId));
      expect(allNotifs).toHaveLength(0);
    });

    it("should include event location in notification body", async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(events).values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Lunch",
        eventType: "meal",
        startTime,
        location: "Downtown Restaurant",
      });

      await schedulerService.processEventReminders();

      const memNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testMemberId));
      expect(memNotifs).toHaveLength(1);
      expect(memNotifs[0].body).toBe(
        "Lunch starts in 1 hour at Downtown Restaurant",
      );
    });
  });

  describe("processDailyItineraries", () => {
    // Use a fixed fake UTC time of 2026-02-15T12:00:00Z for daily itinerary tests.
    // This gives us UTC hour=12, minute=0. With Etc/GMT+4 (UTC-4), local time = 8:00 AM.
    // The morning window check will pass for that timezone.
    const fakeUtcTime = new Date("2026-02-15T12:00:00Z");
    const fakeTodayStr = "2026-02-15";
    const fakeTomorrowStr = "2026-02-16";

    // Timezone where it's 8:00 AM at the fake UTC time (UTC hour 12 -> local hour 8 = offset -4)
    // Etc/GMT+4 means UTC-4 (inverted sign)
    const morningTz = "Etc/GMT+4";

    // Timezone where it's 2:00 PM at the fake UTC time (UTC hour 12 -> local hour 14 = offset +2)
    const afternoonTz = "Etc/GMT-2";

    it("should create notification when trip timezone is in morning window", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(fakeUtcTime);

      await db
        .update(trips)
        .set({
          preferredTimezone: morningTz,
          startDate: fakeTodayStr,
          endDate: fakeTomorrowStr,
        })
        .where(eq(trips.id, testTripId));

      await schedulerService.processDailyItineraries();

      // All going members should get a daily itinerary notification
      const memNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testMemberId));
      expect(memNotifs).toHaveLength(1);
      expect(memNotifs[0].type).toBe("daily_itinerary");
      expect(memNotifs[0].title).toBe(
        "Scheduler Test Trip - Today's Schedule",
      );
    });

    it("should NOT create notification when outside morning window", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(fakeUtcTime);

      await db
        .update(trips)
        .set({
          preferredTimezone: afternoonTz,
          startDate: fakeTodayStr,
          endDate: fakeTomorrowStr,
        })
        .where(eq(trips.id, testTripId));

      await schedulerService.processDailyItineraries();

      const allNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.tripId, testTripId));
      expect(allNotifs).toHaveLength(0);
    });

    it("should deduplicate: second call does not create duplicate", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(fakeUtcTime);

      await db
        .update(trips)
        .set({
          preferredTimezone: morningTz,
          startDate: fakeTodayStr,
          endDate: fakeTomorrowStr,
        })
        .where(eq(trips.id, testTripId));

      await schedulerService.processDailyItineraries();
      await schedulerService.processDailyItineraries();

      const memNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testMemberId));
      expect(memNotifs).toHaveLength(1);
    });

    it("should respect dailyItinerary=false preference", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(fakeUtcTime);

      // Disable dailyItinerary for testMemberId
      await db
        .insert(notificationPreferences)
        .values({
          userId: testMemberId,
          tripId: testTripId,
          eventReminders: true,
          dailyItinerary: false,
          tripMessages: true,
        })
        .onConflictDoNothing();

      await db
        .update(trips)
        .set({
          preferredTimezone: morningTz,
          startDate: fakeTodayStr,
          endDate: fakeTomorrowStr,
        })
        .where(eq(trips.id, testTripId));

      await schedulerService.processDailyItineraries();

      // testMemberId should NOT have a notification
      const memNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testMemberId));
      expect(memNotifs).toHaveLength(0);

      // organizer should still get one (default prefs)
      const orgNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testOrganizerId));
      expect(orgNotifs).toHaveLength(1);
    });

    it("should only notify going members", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(fakeUtcTime);

      // Change member2 to 'not_going'
      await db
        .update(members)
        .set({ status: "not_going" })
        .where(eq(members.userId, testMember2Id));

      await db
        .update(trips)
        .set({
          preferredTimezone: morningTz,
          startDate: fakeTodayStr,
          endDate: fakeTomorrowStr,
        })
        .where(eq(trips.id, testTripId));

      await schedulerService.processDailyItineraries();

      // member2 should NOT have a notification
      const mem2Notifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testMember2Id));
      expect(mem2Notifs).toHaveLength(0);

      // organizer and member should have notifications
      const orgNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testOrganizerId));
      expect(orgNotifs).toHaveLength(1);
    });

    it("should skip cancelled trips", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(fakeUtcTime);

      await db
        .update(trips)
        .set({
          preferredTimezone: morningTz,
          startDate: fakeTodayStr,
          endDate: fakeTomorrowStr,
          cancelled: true,
        })
        .where(eq(trips.id, testTripId));

      await schedulerService.processDailyItineraries();

      const allNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.tripId, testTripId));
      expect(allNotifs).toHaveLength(0);
    });

    it("should include event list in notification body", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(fakeUtcTime);

      await db
        .update(trips)
        .set({
          preferredTimezone: morningTz,
          startDate: fakeTodayStr,
          endDate: fakeTomorrowStr,
        })
        .where(eq(trips.id, testTripId));

      // morningTz is Etc/GMT+4 = UTC-4, so offset is -4 hours
      // 9:00 AM local = 13:00 UTC, 12:00 PM local = 16:00 UTC
      const event1Start = new Date(`${fakeTodayStr}T13:00:00Z`);
      const event2Start = new Date(`${fakeTodayStr}T16:00:00Z`);

      await db.insert(events).values([
        {
          tripId: testTripId,
          createdBy: testOrganizerId,
          name: "Museum Visit",
          eventType: "activity",
          startTime: event1Start,
        },
        {
          tripId: testTripId,
          createdBy: testOrganizerId,
          name: "Lunch",
          eventType: "meal",
          startTime: event2Start,
        },
      ]);

      await schedulerService.processDailyItineraries();

      const memNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testMemberId));
      expect(memNotifs).toHaveLength(1);
      expect(memNotifs[0].body).toContain("Museum Visit");
      expect(memNotifs[0].body).toContain("Lunch");
      expect(memNotifs[0].body).toContain("1.");
      expect(memNotifs[0].body).toContain("2.");
    });

    it("should use correct referenceId format (tripId:YYYY-MM-DD)", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(fakeUtcTime);

      await db
        .update(trips)
        .set({
          preferredTimezone: morningTz,
          startDate: fakeTodayStr,
          endDate: fakeTomorrowStr,
        })
        .where(eq(trips.id, testTripId));

      await schedulerService.processDailyItineraries();

      // Check sentReminders for the correct referenceId format
      const reminders = await db
        .select()
        .from(sentReminders)
        .where(eq(sentReminders.userId, testMemberId));

      const dailyReminder = reminders.find(
        (r) => r.type === "daily_itinerary",
      );
      expect(dailyReminder).toBeDefined();

      // referenceId should be tripId:YYYY-MM-DD in trip timezone
      // At fakeUtcTime (2026-02-15T12:00Z), morningTz (UTC-4) gives date 2026-02-15
      expect(dailyReminder!.referenceId).toBe(
        `${testTripId}:${fakeTodayStr}`,
      );
    });
  });

  describe("start/stop lifecycle", () => {
    it("should create two interval timers when start() is called", () => {
      const setIntervalSpy = vi.spyOn(global, "setInterval");

      const testScheduler = new SchedulerService(
        notificationService,
        db,
      );
      testScheduler.start();

      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
      // First interval: event reminders (300000ms)
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        300000,
      );
      // Second interval: daily itineraries (900000ms)
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        900000,
      );

      testScheduler.stop();
      setIntervalSpy.mockRestore();
    });

    it("should clear both timers when stop() is called", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const testScheduler = new SchedulerService(
        notificationService,
        db,
      );
      testScheduler.start();
      testScheduler.stop();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);

      clearIntervalSpy.mockRestore();
    });

    it("should handle stop() called without start() safely", () => {
      const testScheduler = new SchedulerService(
        notificationService,
        db,
      );
      // Should not throw
      expect(() => testScheduler.stop()).not.toThrow();
    });
  });

  describe("timezone handling", () => {
    it("should detect morning window correctly for different timezones", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));

      // morningTz: Etc/GMT+4 (UTC-4) -> 12:00 UTC = 8:00 AM local (in window)
      const morningTz = "Etc/GMT+4";
      // afternoonTz: Etc/GMT-2 (UTC+2) -> 12:00 UTC = 14:00 local (not in window)
      const afternoonTz = "Etc/GMT-2";

      // Create a second trip with afternoon timezone
      const trip2Result = await db
        .insert(trips)
        .values({
          name: "Afternoon Trip",
          destination: "Somewhere Else",
          preferredTimezone: afternoonTz,
          startDate: "2026-02-15",
          endDate: "2026-02-16",
          createdBy: testOrganizerId,
        })
        .returning();
      const trip2Id = trip2Result[0].id;

      // Add member to trip2
      await db.insert(members).values({
        tripId: trip2Id,
        userId: testMemberId,
        status: "going",
      });

      // Update main trip to morning timezone
      await db
        .update(trips)
        .set({
          preferredTimezone: morningTz,
          startDate: "2026-02-15",
          endDate: "2026-02-16",
        })
        .where(eq(trips.id, testTripId));

      await schedulerService.processDailyItineraries();

      // Main trip (morning tz) should generate notifications
      const mainTripNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.tripId, testTripId));
      expect(mainTripNotifs.length).toBeGreaterThan(0);

      // Afternoon trip should NOT generate notifications
      const trip2Notifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.tripId, trip2Id));
      expect(trip2Notifs).toHaveLength(0);

      // Cleanup trip2
      await db
        .delete(notifications)
        .where(eq(notifications.tripId, trip2Id));
      await db.delete(members).where(eq(members.tripId, trip2Id));
      await db.delete(trips).where(eq(trips.id, trip2Id));
    });

    it("should filter events by today in trip timezone", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));

      const tz = "Etc/GMT+4"; // UTC-4, so 12:00 UTC = 8:00 AM local on 2026-02-15

      await db
        .update(trips)
        .set({
          preferredTimezone: tz,
          startDate: "2026-02-15",
          endDate: "2026-02-16",
        })
        .where(eq(trips.id, testTripId));

      // Create an event for today (10:00 AM local = 14:00 UTC)
      const todayEvent = new Date("2026-02-15T14:00:00Z");

      // Create an event for yesterday (10:00 AM local yesterday = 2026-02-14T14:00Z)
      const yesterdayEvent = new Date("2026-02-14T14:00:00Z");

      await db.insert(events).values([
        {
          tripId: testTripId,
          createdBy: testOrganizerId,
          name: "Today Event",
          eventType: "activity",
          startTime: todayEvent,
        },
        {
          tripId: testTripId,
          createdBy: testOrganizerId,
          name: "Yesterday Event",
          eventType: "activity",
          startTime: yesterdayEvent,
        },
      ]);

      await schedulerService.processDailyItineraries();

      const memNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testMemberId));
      expect(memNotifs).toHaveLength(1);
      expect(memNotifs[0].body).toContain("Today Event");
      expect(memNotifs[0].body).not.toContain("Yesterday Event");
    });
  });
});
