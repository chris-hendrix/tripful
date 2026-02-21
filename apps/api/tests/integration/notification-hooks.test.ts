import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../helpers.js";
import { db } from "@/config/database.js";
import {
  users,
  trips,
  members,
  messages,
  notifications,
  notificationPreferences,
} from "@/db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { generateUniquePhone } from "../test-utils.js";

describe("Notification Hooks", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Message creation triggers notifications", () => {
    it("should notify other going members when a top-level message is created", async () => {
      app = await buildApp();

      // Create 3 users: organizer (userA), memberB, memberC
      const [userA] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "User A",
          timezone: "UTC",
        })
        .returning();

      const [userB] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "User B",
          timezone: "UTC",
        })
        .returning();

      const [userC] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "User C",
          timezone: "UTC",
        })
        .returning();

      // Create a trip
      const [trip] = await db
        .insert(trips)
        .values({
          name: "Notification Test Trip",
          destination: "Paris",
          preferredTimezone: "UTC",
          createdBy: userA.id,
        })
        .returning();

      // Add all 3 as going members
      await db.insert(members).values([
        {
          tripId: trip.id,
          userId: userA.id,
          status: "going",
          isOrganizer: true,
        },
        { tripId: trip.id, userId: userB.id, status: "going" },
        { tripId: trip.id, userId: userC.id, status: "going" },
      ]);

      const tokenA = app.jwt.sign({
        sub: userA.id,
        name: userA.displayName,
      });

      // Post a top-level message as userA
      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/messages`,
        cookies: { auth_token: tokenA },
        payload: { content: "Hello everyone!" },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      const messageId = body.message.id;

      // In test environment, boss is null so notifyTripMembers uses the inline fallback path
      // Query notifications table
      const notifs = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.tripId, trip.id),
            eq(notifications.type, "trip_message"),
          ),
        );

      // userB and userC should each have a notification
      const userBNotifs = notifs.filter((n) => n.userId === userB.id);
      const userCNotifs = notifs.filter((n) => n.userId === userC.id);
      const userANotifs = notifs.filter((n) => n.userId === userA.id);

      expect(userBNotifs).toHaveLength(1);
      expect(userCNotifs).toHaveLength(1);
      // userA (the author) should NOT have a notification
      expect(userANotifs).toHaveLength(0);

      // Verify notification data contains messageId
      expect(userBNotifs[0].data).toMatchObject({ messageId });
      expect(userCNotifs[0].data).toMatchObject({ messageId });

      // Verify notification body format
      expect(userBNotifs[0].body).toContain("User A");
      expect(userBNotifs[0].body).toContain("Hello everyone!");
    });

    it("should NOT trigger notifications for reply messages", async () => {
      app = await buildApp();

      const [userA] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "User A",
          timezone: "UTC",
        })
        .returning();

      const [userB] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "User B",
          timezone: "UTC",
        })
        .returning();

      const [trip] = await db
        .insert(trips)
        .values({
          name: "Reply Test Trip",
          destination: "London",
          preferredTimezone: "UTC",
          createdBy: userA.id,
        })
        .returning();

      await db.insert(members).values([
        {
          tripId: trip.id,
          userId: userA.id,
          status: "going",
          isOrganizer: true,
        },
        { tripId: trip.id, userId: userB.id, status: "going" },
      ]);

      // Create a top-level message directly in DB (bypasses notifications)
      const [parentMessage] = await db
        .insert(messages)
        .values({
          tripId: trip.id,
          authorId: userA.id,
          content: "Parent message",
        })
        .returning();

      // Clear any existing notifications for this trip
      await db
        .delete(notifications)
        .where(eq(notifications.tripId, trip.id));

      const tokenB = app.jwt.sign({
        sub: userB.id,
        name: userB.displayName,
      });

      // Post a reply as userB
      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/messages`,
        cookies: { auth_token: tokenB },
        payload: {
          content: "This is a reply",
          parentId: parentMessage.id,
        },
      });

      expect(response.statusCode).toBe(201);

      // Query notifications - should be none for this trip after clearing
      const notifs = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.tripId, trip.id),
            eq(notifications.type, "trip_message"),
          ),
        );

      expect(notifs).toHaveLength(0);
    });
  });

  describe("RSVP to going creates default preferences", () => {
    it("should create default notification preferences when RSVP changes to going", async () => {
      app = await buildApp();

      // Create organizer
      const [organizer] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      // Create member with no_response status
      const [member] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Member",
          timezone: "UTC",
        })
        .returning();

      const [trip] = await db
        .insert(trips)
        .values({
          name: "RSVP Test Trip",
          destination: "Tokyo",
          preferredTimezone: "UTC",
          createdBy: organizer.id,
        })
        .returning();

      // Add organizer as going
      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      // Add member with no_response status
      await db.insert(members).values({
        tripId: trip.id,
        userId: member.id,
        status: "no_response",
      });

      const memberToken = app.jwt.sign({
        sub: member.id,
        name: member.displayName,
      });

      // RSVP to "going"
      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/rsvp`,
        cookies: { auth_token: memberToken },
        payload: { status: "going" },
      });

      expect(response.statusCode).toBe(200);

      // Query notificationPreferences table
      const prefs = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.userId, member.id),
            eq(notificationPreferences.tripId, trip.id),
          ),
        );

      expect(prefs).toHaveLength(1);
      expect(prefs[0].dailyItinerary).toBe(true);
      expect(prefs[0].tripMessages).toBe(true);
    });

    it("should NOT create notification preferences when RSVP is not_going", async () => {
      app = await buildApp();

      const [organizer] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const [member] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Member",
          timezone: "UTC",
        })
        .returning();

      const [trip] = await db
        .insert(trips)
        .values({
          name: "Not Going Test Trip",
          destination: "Berlin",
          preferredTimezone: "UTC",
          createdBy: organizer.id,
        })
        .returning();

      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      await db.insert(members).values({
        tripId: trip.id,
        userId: member.id,
        status: "no_response",
      });

      const memberToken = app.jwt.sign({
        sub: member.id,
        name: member.displayName,
      });

      // RSVP to "not_going"
      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/rsvp`,
        cookies: { auth_token: memberToken },
        payload: { status: "not_going" },
      });

      expect(response.statusCode).toBe(200);

      // Query notificationPreferences table - should be empty
      const prefs = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.userId, member.id),
            eq(notificationPreferences.tripId, trip.id),
          ),
        );

      expect(prefs).toHaveLength(0);
    });

    it("should NOT create notification preferences when RSVP is maybe", async () => {
      app = await buildApp();

      const [organizer] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const [member] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Member",
          timezone: "UTC",
        })
        .returning();

      const [trip] = await db
        .insert(trips)
        .values({
          name: "Maybe Test Trip",
          destination: "Rome",
          preferredTimezone: "UTC",
          createdBy: organizer.id,
        })
        .returning();

      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      await db.insert(members).values({
        tripId: trip.id,
        userId: member.id,
        status: "no_response",
      });

      const memberToken = app.jwt.sign({
        sub: member.id,
        name: member.displayName,
      });

      // RSVP to "maybe"
      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/rsvp`,
        cookies: { auth_token: memberToken },
        payload: { status: "maybe" },
      });

      expect(response.statusCode).toBe(200);

      // Query notificationPreferences table - should be empty
      const prefs = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.userId, member.id),
            eq(notificationPreferences.tripId, trip.id),
          ),
        );

      expect(prefs).toHaveLength(0);
    });
  });
});
