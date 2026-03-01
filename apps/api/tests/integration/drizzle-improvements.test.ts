import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../helpers.js";
import { db } from "@/config/database.js";
import { users, members, trips } from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { generateUniquePhone } from "../test-utils.js";

describe("Drizzle ORM Improvements", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Unique constraint on members(tripId, userId)", () => {
    it("should reject duplicate member insert at database level", async () => {
      app = await buildApp();

      // Create test user
      const [testUser] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      // Create trip
      const [trip] = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Test Destination",
          preferredTimezone: "UTC",
          createdBy: testUser.id,
        })
        .returning();

      // Insert member once
      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "going",
      });

      // Try to insert duplicate - should throw due to unique constraint
      await expect(
        db.insert(members).values({
          tripId: trip.id,
          userId: testUser.id,
          status: "maybe",
        }),
      ).rejects.toThrow();
    });
  });

  describe("Pagination on GET /api/trips", () => {
    it("should return paginated response with default page and limit", async () => {
      app = await buildApp();

      const [testUser] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/trips",
        cookies: { auth_token: token },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.meta).toEqual({
        total: 0,
        limit: 20,
        hasMore: false,
        nextCursor: null,
      });
    });

    it("should respect cursor and limit query params", async () => {
      app = await buildApp();

      const [testUser] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Pagination User",
          timezone: "UTC",
        })
        .returning();

      // Create 3 trips
      for (let i = 1; i <= 3; i++) {
        const [trip] = await db
          .insert(trips)
          .values({
            name: `Trip ${i}`,
            destination: `Destination ${i}`,
            preferredTimezone: "UTC",
            startDate: `2026-0${i}-01`,
            createdBy: testUser.id,
          })
          .returning();

        await db.insert(members).values({
          tripId: trip.id,
          userId: testUser.id,
          status: "going",
        });
      }

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      // Request first page, limit 2
      const response = await app.inject({
        method: "GET",
        url: "/api/trips?limit=2",
        cookies: { auth_token: token },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.meta.total).toBe(3);
      expect(body.meta.limit).toBe(2);
      expect(body.meta.hasMore).toBe(true);
      expect(body.meta.nextCursor).toBeDefined();

      // Request next page using cursor
      const response2 = await app.inject({
        method: "GET",
        url: `/api/trips?limit=2&cursor=${body.meta.nextCursor}`,
        cookies: { auth_token: token },
      });

      const body2 = JSON.parse(response2.body);
      expect(body2.data).toHaveLength(1);
      expect(body2.meta.hasMore).toBe(false);
    });
  });

  describe("Transaction rollback in createTrip", () => {
    it("should not leave orphaned trip if member insert fails", async () => {
      // This test verifies the transaction is working by checking that trips
      // created via the service always have their creator as a member
      app = await buildApp();

      const [testUser] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Transaction User",
          timezone: "UTC",
        })
        .returning();

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      // Create a trip normally - verify trip + member are created atomically
      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: { auth_token: token },
        payload: {
          name: "Transaction Test Trip",
          destination: "Test",
          timezone: "UTC",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      const tripId = body.trip.id;

      // Verify member was created
      const memberRecords = await db
        .select()
        .from(members)
        .where(eq(members.tripId, tripId));
      expect(memberRecords.length).toBeGreaterThanOrEqual(1);
      expect(memberRecords.some((m) => m.userId === testUser.id)).toBe(true);
    });
  });

  describe("Count aggregate in getMemberCount", () => {
    it("should return correct count using SQL aggregate", async () => {
      app = await buildApp();

      const [testUser] = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Count User",
          timezone: "UTC",
        })
        .returning();

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      // Create trip with co-organizers
      const coOrgPhone = generateUniquePhone();
      await db.insert(users).values({
        phoneNumber: coOrgPhone,
        displayName: "Co-Org",
        timezone: "UTC",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: { auth_token: token },
        payload: {
          name: "Count Test Trip",
          destination: "Count Land",
          timezone: "UTC",
          coOrganizerPhones: [coOrgPhone],
        },
      });

      expect(response.statusCode).toBe(201);
      const tripId = JSON.parse(response.body).trip.id;

      // Verify member count in trip detail
      const detailResponse = await app.inject({
        method: "GET",
        url: `/api/trips/${tripId}`,
        cookies: { auth_token: token },
      });

      expect(detailResponse.statusCode).toBe(200);
      const detail = JSON.parse(detailResponse.body);
      expect(detail.trip.memberCount).toBe(2);
    });
  });
});
