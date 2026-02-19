import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Job } from "pg-boss";
import { db } from "@/config/database.js";
import { events, members, trips, users } from "@/db/schema/index.js";
import { eq, or } from "drizzle-orm";
import { handleEventReminders } from "@/queues/workers/event-reminders.worker.js";
import type { WorkerDeps, NotificationBatchPayload } from "@/queues/types.js";
import { QUEUE } from "@/queues/types.js";
import type { SendOptions } from "pg-boss";
import { generateUniquePhone } from "../../test-utils.js";

describe("event-reminders.worker", () => {
  let testOrganizerPhone: string;
  let testOrganizerId: string;
  let testTripId: string;

  let mockDeps: WorkerDeps;

  const cleanup = async () => {
    const phoneNumbers = [testOrganizerPhone].filter(Boolean);

    if (testTripId) {
      await db.delete(events).where(eq(events.tripId, testTripId));
      await db.delete(members).where(eq(members.tripId, testTripId));
      await db.delete(trips).where(eq(trips.id, testTripId));
    }

    if (phoneNumbers.length > 0) {
      await db
        .delete(users)
        .where(
          or(...phoneNumbers.map((phone) => eq(users.phoneNumber, phone))),
        );
    }
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));

    testOrganizerPhone = generateUniquePhone();

    await cleanup();

    // Create test user
    const organizerResult = await db
      .insert(users)
      .values({
        phoneNumber: testOrganizerPhone,
        displayName: "Reminder Organizer",
        timezone: "UTC",
      })
      .returning();
    testOrganizerId = organizerResult[0].id;

    // Create test trip
    const tripResult = await db
      .insert(trips)
      .values({
        name: "Reminder Test Trip",
        destination: "Test Destination",
        preferredTimezone: "UTC",
        createdBy: testOrganizerId,
      })
      .returning();
    testTripId = tripResult[0].id;

    // Add organizer as member
    await db.insert(members).values({
      tripId: testTripId,
      userId: testOrganizerId,
      status: "going",
      isOrganizer: true,
    });

    mockDeps = {
      db,
      boss: {
        send: vi.fn().mockResolvedValue(undefined),
      } as unknown as WorkerDeps["boss"],
      smsService: { sendMessage: vi.fn() } as unknown as WorkerDeps["smsService"],
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      } as unknown as WorkerDeps["logger"],
    };
  });

  afterEach(async () => {
    await cleanup();
    vi.useRealTimers();
  });

  function createMockJob(): Job<object> {
    return {
      id: "test-cron-job-id",
      name: "event-reminders",
      data: {},
      expireInSeconds: 300,
      heartbeatSeconds: null,
      signal: new AbortController().signal,
    } as Job<object>;
  }

  it("should enqueue batch job for event starting in ~60 minutes", async () => {
    // Create event starting in 60 minutes (within 55-65 min window)
    const eventStartTime = new Date(Date.now() + 60 * 60 * 1000);
    const eventResult = await db
      .insert(events)
      .values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Team Lunch",
        eventType: "meal",
        startTime: eventStartTime,
        allDay: false,
      })
      .returning();

    await handleEventReminders(createMockJob(), mockDeps);

    expect(mockDeps.boss.send).toHaveBeenCalledTimes(1);
    expect(mockDeps.boss.send).toHaveBeenCalledWith(
      QUEUE.NOTIFICATION_BATCH,
      {
        tripId: testTripId,
        type: "event_reminder",
        title: "Reminder Test Trip",
        body: "Team Lunch starts in 1 hour",
        data: {
          eventId: eventResult[0].id,
          referenceId: eventResult[0].id,
        },
      },
      {
        singletonKey: `event-reminder:${eventResult[0].id}`,
        expireInSeconds: 300,
      },
    );
  });

  it("should include location in body when present", async () => {
    const eventStartTime = new Date(Date.now() + 60 * 60 * 1000);
    await db.insert(events).values({
      tripId: testTripId,
      createdBy: testOrganizerId,
      name: "Beach Party",
      eventType: "activity",
      location: "Waikiki Beach",
      startTime: eventStartTime,
      allDay: false,
    });

    await handleEventReminders(createMockJob(), mockDeps);

    expect(mockDeps.boss.send).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(mockDeps.boss.send).mock.calls[0][1] as NotificationBatchPayload;
    expect(payload.body).toBe("Beach Party starts in 1 hour at Waikiki Beach");
  });

  it("should not enqueue for events outside the 55-65 minute window", async () => {
    // Event starting in 30 minutes (too soon)
    await db.insert(events).values({
      tripId: testTripId,
      createdBy: testOrganizerId,
      name: "Too Soon Event",
      eventType: "activity",
      startTime: new Date(Date.now() + 30 * 60 * 1000),
      allDay: false,
    });

    // Event starting in 2 hours (too far)
    await db.insert(events).values({
      tripId: testTripId,
      createdBy: testOrganizerId,
      name: "Too Far Event",
      eventType: "activity",
      startTime: new Date(Date.now() + 120 * 60 * 1000),
      allDay: false,
    });

    await handleEventReminders(createMockJob(), mockDeps);

    expect(mockDeps.boss.send).not.toHaveBeenCalled();
  });

  it("should skip deleted events", async () => {
    const eventStartTime = new Date(Date.now() + 60 * 60 * 1000);
    await db.insert(events).values({
      tripId: testTripId,
      createdBy: testOrganizerId,
      name: "Deleted Event",
      eventType: "activity",
      startTime: eventStartTime,
      allDay: false,
      deletedAt: new Date(),
    });

    await handleEventReminders(createMockJob(), mockDeps);

    expect(mockDeps.boss.send).not.toHaveBeenCalled();
  });

  it("should skip all-day events", async () => {
    const eventStartTime = new Date(Date.now() + 60 * 60 * 1000);
    await db.insert(events).values({
      tripId: testTripId,
      createdBy: testOrganizerId,
      name: "All Day Event",
      eventType: "activity",
      startTime: eventStartTime,
      allDay: true,
    });

    await handleEventReminders(createMockJob(), mockDeps);

    expect(mockDeps.boss.send).not.toHaveBeenCalled();
  });

  it("should resolve trip name correctly for the notification title", async () => {
    const eventStartTime = new Date(Date.now() + 60 * 60 * 1000);
    await db.insert(events).values({
      tripId: testTripId,
      createdBy: testOrganizerId,
      name: "Museum Visit",
      eventType: "activity",
      startTime: eventStartTime,
      allDay: false,
    });

    await handleEventReminders(createMockJob(), mockDeps);

    const payload = vi.mocked(mockDeps.boss.send).mock.calls[0][1] as NotificationBatchPayload;
    expect(payload.title).toBe("Reminder Test Trip");
  });

  it("should enqueue separate batch jobs for multiple events", async () => {
    const eventStartTime1 = new Date(Date.now() + 58 * 60 * 1000);
    const eventStartTime2 = new Date(Date.now() + 62 * 60 * 1000);

    const event1 = await db
      .insert(events)
      .values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Event One",
        eventType: "meal",
        startTime: eventStartTime1,
        allDay: false,
      })
      .returning();

    const event2 = await db
      .insert(events)
      .values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Event Two",
        eventType: "activity",
        startTime: eventStartTime2,
        allDay: false,
      })
      .returning();

    await handleEventReminders(createMockJob(), mockDeps);

    expect(mockDeps.boss.send).toHaveBeenCalledTimes(2);

    const call1 = vi.mocked(mockDeps.boss.send).mock.calls[0];
    const call2 = vi.mocked(mockDeps.boss.send).mock.calls[1];

    // Each call should use the event's id as singletonKey
    const singletonKeys = [
      (call1[2] as SendOptions).singletonKey,
      (call2[2] as SendOptions).singletonKey,
    ];
    expect(singletonKeys).toContain(`event-reminder:${event1[0].id}`);
    expect(singletonKeys).toContain(`event-reminder:${event2[0].id}`);
  });

  it("should use correct singletonKey format", async () => {
    const eventStartTime = new Date(Date.now() + 60 * 60 * 1000);
    const eventResult = await db
      .insert(events)
      .values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Singleton Test Event",
        eventType: "activity",
        startTime: eventStartTime,
        allDay: false,
      })
      .returning();

    await handleEventReminders(createMockJob(), mockDeps);

    const options = vi.mocked(mockDeps.boss.send).mock.calls[0][2] as SendOptions;
    expect(options.singletonKey).toBe(
      `event-reminder:${eventResult[0].id}`,
    );
    expect(options.expireInSeconds).toBe(300);
  });

  it("should do nothing when no events are in the window", async () => {
    await handleEventReminders(createMockJob(), mockDeps);

    expect(mockDeps.boss.send).not.toHaveBeenCalled();
    expect(mockDeps.logger.info).not.toHaveBeenCalled();
  });

  it("should log the count of enqueued events", async () => {
    const eventStartTime = new Date(Date.now() + 60 * 60 * 1000);
    await db.insert(events).values({
      tripId: testTripId,
      createdBy: testOrganizerId,
      name: "Log Test Event",
      eventType: "activity",
      startTime: eventStartTime,
      allDay: false,
    });

    await handleEventReminders(createMockJob(), mockDeps);

    expect(mockDeps.logger.info).toHaveBeenCalledWith(
      { count: 1 },
      "enqueued event reminder batches",
    );
  });

  it("should include referenceId in data for dedup", async () => {
    const eventStartTime = new Date(Date.now() + 60 * 60 * 1000);
    const eventResult = await db
      .insert(events)
      .values({
        tripId: testTripId,
        createdBy: testOrganizerId,
        name: "Dedup Test Event",
        eventType: "activity",
        startTime: eventStartTime,
        allDay: false,
      })
      .returning();

    await handleEventReminders(createMockJob(), mockDeps);

    const payload = vi.mocked(mockDeps.boss.send).mock.calls[0][1] as NotificationBatchPayload;
    expect(payload.data.referenceId).toBe(eventResult[0].id);
    expect(payload.data.eventId).toBe(eventResult[0].id);
  });

  it("should handle events at the boundary of the window (55 min)", async () => {
    const eventStartTime = new Date(Date.now() + 55 * 60 * 1000);
    await db.insert(events).values({
      tripId: testTripId,
      createdBy: testOrganizerId,
      name: "Boundary Low Event",
      eventType: "activity",
      startTime: eventStartTime,
      allDay: false,
    });

    await handleEventReminders(createMockJob(), mockDeps);

    expect(mockDeps.boss.send).toHaveBeenCalledTimes(1);
  });

  it("should handle events at the boundary of the window (65 min)", async () => {
    const eventStartTime = new Date(Date.now() + 65 * 60 * 1000);
    await db.insert(events).values({
      tripId: testTripId,
      createdBy: testOrganizerId,
      name: "Boundary High Event",
      eventType: "activity",
      startTime: eventStartTime,
      allDay: false,
    });

    await handleEventReminders(createMockJob(), mockDeps);

    expect(mockDeps.boss.send).toHaveBeenCalledTimes(1);
  });
});
