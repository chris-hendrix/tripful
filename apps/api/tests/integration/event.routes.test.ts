import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../helpers.js";
import { db } from "@/config/database.js";
import { users, trips, members, events } from "@/db/schema/index.js";
import { generateUniquePhone } from "../test-utils.js";

describe("Event Routes", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("POST /api/trips/:tripId/events", () => {
    it("should create event and return 201", async () => {
      app = await buildApp();

      // Create test user with complete profile
      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      // Create a trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      // Add user as member
      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "going",
      });

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/events`,
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Eiffel Tower Visit",
          eventType: "activity",
          startTime: "2026-06-15T14:00:00Z",
          description: "Visit the Eiffel Tower",
          location: "Eiffel Tower, Paris",
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("event");
      expect(body.event).toMatchObject({
        name: "Eiffel Tower Visit",
        eventType: "activity",
        description: "Visit the Eiffel Tower",
        location: "Eiffel Tower, Paris",
        tripId: trip.id,
        createdBy: testUser.id,
      });
    });

    it("should return 401 if not authenticated", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/trips/550e8400-e29b-41d4-a716-446655440000/events",
        payload: {
          name: "Test Event",
          eventType: "activity",
          startTime: "2026-06-15T14:00:00Z",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 403 if user lacks permission", async () => {
      app = await buildApp();

      // Create trip owner
      const ownerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Owner",
          timezone: "UTC",
        })
        .returning();

      const owner = ownerResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Owner's Trip",
          destination: "Paris",
          preferredTimezone: "Europe/Paris",
          createdBy: owner.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: owner.id,
        status: "going",
      });

      // Create unauthorized user
      const unauthorizedResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Unauthorized User",
          timezone: "UTC",
        })
        .returning();

      const unauthorized = unauthorizedResult[0];

      const token = app.jwt.sign({
        sub: unauthorized.id,
        phone: unauthorized.phoneNumber,
        name: unauthorized.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/events`,
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Unauthorized Event",
          eventType: "activity",
          startTime: "2026-06-15T14:00:00Z",
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 400 for invalid event data", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "going",
      });

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/events`,
        cookies: {
          auth_token: token,
        },
        payload: {
          // Missing required fields
          name: "Test Event",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/trips/:tripId/events", () => {
    it("should list all events for a trip", async () => {
      app = await buildApp();

      // Create test user
      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "going",
      });

      // Create events
      await db.insert(events).values([
        {
          tripId: trip.id,
          createdBy: testUser.id,
          name: "Event 1",
          eventType: "activity",
          startTime: new Date("2026-06-15T14:00:00Z"),
        },
        {
          tripId: trip.id,
          createdBy: testUser.id,
          name: "Event 2",
          eventType: "meal",
          startTime: new Date("2026-06-15T18:00:00Z"),
        },
      ]);

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${trip.id}/events`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("events");
      expect(body.events).toHaveLength(2);
    });

    it("should filter events by type", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "going",
      });

      await db.insert(events).values([
        {
          tripId: trip.id,
          createdBy: testUser.id,
          name: "Activity Event",
          eventType: "activity",
          startTime: new Date("2026-06-15T14:00:00Z"),
        },
        {
          tripId: trip.id,
          createdBy: testUser.id,
          name: "Meal Event",
          eventType: "meal",
          startTime: new Date("2026-06-15T18:00:00Z"),
        },
      ]);

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${trip.id}/events?type=activity`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.events).toHaveLength(1);
      expect(body.events[0].eventType).toBe("activity");
    });

    it("should return 401 if not authenticated", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "GET",
        url: "/api/trips/550e8400-e29b-41d4-a716-446655440000/events",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /api/events/:id", () => {
    it("should get event by ID", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "going",
      });

      const eventResult = await db
        .insert(events)
        .values({
          tripId: trip.id,
          createdBy: testUser.id,
          name: "Test Event",
          eventType: "activity",
          startTime: new Date("2026-06-15T14:00:00Z"),
        })
        .returning();

      const event = eventResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/events/${event.id}`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("event");
      expect(body.event.id).toBe(event.id);
    });

    it("should return 404 if event not found", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/events/550e8400-e29b-41d4-a716-446655440000",
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("PUT /api/events/:id", () => {
    it("should update event and return 200", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "going",
      });

      const eventResult = await db
        .insert(events)
        .values({
          tripId: trip.id,
          createdBy: testUser.id,
          name: "Original Event",
          eventType: "activity",
          startTime: new Date("2026-06-15T14:00:00Z"),
        })
        .returning();

      const event = eventResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: `/api/events/${event.id}`,
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Updated Event",
          description: "Updated description",
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body.event.name).toBe("Updated Event");
      expect(body.event.description).toBe("Updated description");
    });

    it("should return 403 if user lacks permission", async () => {
      app = await buildApp();

      // Create event owner
      const ownerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Owner",
          timezone: "UTC",
        })
        .returning();

      const owner = ownerResult[0];

      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris",
          preferredTimezone: "Europe/Paris",
          createdBy: owner.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: owner.id,
        status: "going",
      });

      const eventResult = await db
        .insert(events)
        .values({
          tripId: trip.id,
          createdBy: owner.id,
          name: "Test Event",
          eventType: "activity",
          startTime: new Date("2026-06-15T14:00:00Z"),
        })
        .returning();

      const event = eventResult[0];

      // Create unauthorized user
      const unauthorizedResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Unauthorized User",
          timezone: "UTC",
        })
        .returning();

      const unauthorized = unauthorizedResult[0];

      const token = app.jwt.sign({
        sub: unauthorized.id,
        phone: unauthorized.phoneNumber,
        name: unauthorized.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: `/api/events/${event.id}`,
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Unauthorized Update",
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("DELETE /api/events/:id", () => {
    it("should soft delete event and return 200", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "going",
      });

      const eventResult = await db
        .insert(events)
        .values({
          tripId: trip.id,
          createdBy: testUser.id,
          name: "Test Event",
          eventType: "activity",
          startTime: new Date("2026-06-15T14:00:00Z"),
        })
        .returning();

      const event = eventResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/events/${event.id}`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
    });
  });

  describe("POST /api/events/:id/restore", () => {
    it("should restore soft-deleted event and return 200", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "going",
      });

      const eventResult = await db
        .insert(events)
        .values({
          tripId: trip.id,
          createdBy: testUser.id,
          name: "Test Event",
          eventType: "activity",
          startTime: new Date("2026-06-15T14:00:00Z"),
          deletedAt: new Date(),
          deletedBy: testUser.id,
        })
        .returning();

      const event = eventResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/events/${event.id}/restore`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("event");
      expect(body.event.deletedAt).toBeNull();
    });
  });
});
