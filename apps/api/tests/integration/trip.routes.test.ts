import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../helpers.js";
import { db } from "@/config/database.js";
import { users, members, trips } from "@/db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { generateUniquePhone } from "../test-utils.js";

describe("POST /api/trips", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Success Cases", () => {
    it("should create trip with minimal data (name, destination, timezone) and return 201", async () => {
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

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Summer Adventure",
          destination: "Paris, France",
          timezone: "Europe/Paris",
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("trip");
      expect(body.trip).toMatchObject({
        name: "Summer Adventure",
        destination: "Paris, France",
        preferredTimezone: "Europe/Paris",
        createdBy: testUser.id,
        allowMembersToAddEvents: true,
      });
      expect(body.trip).toHaveProperty("id");
      expect(body.trip).toHaveProperty("createdAt");
      expect(body.trip).toHaveProperty("updatedAt");
    });

    it("should create trip with all optional fields and return 201", async () => {
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

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Complete Trip",
          destination: "Tokyo, Japan",
          timezone: "Asia/Tokyo",
          startDate: "2026-06-01",
          endDate: "2026-06-10",
          description: "A comprehensive trip to Japan",
          coverImageUrl: "https://example.com/image.jpg",
          allowMembersToAddEvents: false,
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.trip).toMatchObject({
        name: "Complete Trip",
        destination: "Tokyo, Japan",
        preferredTimezone: "Asia/Tokyo",
        startDate: "2026-06-01",
        endDate: "2026-06-10",
        description: "A comprehensive trip to Japan",
        coverImageUrl: "https://example.com/image.jpg",
        allowMembersToAddEvents: false,
      });
    });

    it("should create trip with co-organizers and return 201", async () => {
      app = await buildApp();

      // Create test users
      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Creator",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      // Create co-organizers
      const coOrg1Phone = generateUniquePhone();
      const coOrg2Phone = generateUniquePhone();

      await db.insert(users).values([
        {
          phoneNumber: coOrg1Phone,
          displayName: "Co-Organizer 1",
          timezone: "UTC",
        },
        {
          phoneNumber: coOrg2Phone,
          displayName: "Co-Organizer 2",
          timezone: "UTC",
        },
      ]);

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Group Trip",
          destination: "New York, USA",
          timezone: "America/New_York",
          coOrganizerPhones: [coOrg1Phone, coOrg2Phone],
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.trip.name).toBe("Group Trip");
    });

    it("should create member record for creator with status='going'", async () => {
      app = await buildApp();

      // Create test user
      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Creator User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Test Trip",
          destination: "London, UK",
          timezone: "Europe/London",
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      const tripId = body.trip.id;

      // Verify member record was created for creator
      const memberRecords = await db
        .select()
        .from(members)
        .where(and(eq(members.tripId, tripId), eq(members.userId, testUser.id)))
        .limit(1);

      expect(memberRecords).toHaveLength(1);
      expect(memberRecords[0].status).toBe("going");
    });

    it("should create member records for co-organizers with status='going'", async () => {
      app = await buildApp();

      // Create test users
      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Creator",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      // Create co-organizers
      const coOrg1Phone = generateUniquePhone();
      const coOrg2Phone = generateUniquePhone();

      const coOrgsResult = await db
        .insert(users)
        .values([
          {
            phoneNumber: coOrg1Phone,
            displayName: "Co-Organizer 1",
            timezone: "UTC",
          },
          {
            phoneNumber: coOrg2Phone,
            displayName: "Co-Organizer 2",
            timezone: "UTC",
          },
        ])
        .returning();

      const coOrgIds = coOrgsResult.map((u) => u.id);

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Co-Org Trip",
          destination: "Berlin, Germany",
          timezone: "Europe/Berlin",
          coOrganizerPhones: [coOrg1Phone, coOrg2Phone],
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      const tripId = body.trip.id;

      // Verify member records for co-organizers
      const coOrgMemberRecords = await db
        .select()
        .from(members)
        .where(eq(members.tripId, tripId));

      // Should have 3 members: creator + 2 co-organizers
      expect(coOrgMemberRecords).toHaveLength(3);

      // Verify co-organizers have status='going'
      const coOrgMembers = coOrgMemberRecords.filter((m) =>
        coOrgIds.includes(m.userId),
      );
      expect(coOrgMembers).toHaveLength(2);
      expect(coOrgMembers[0].status).toBe("going");
      expect(coOrgMembers[1].status).toBe("going");
    });
  });

  describe("Validation Errors (400)", () => {
    it("should return 400 when name is missing", async () => {
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

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          destination: "Paris, France",
          timezone: "Europe/Paris",
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: expect.any(Array),
        },
      });
    });

    it("should return 400 when name is too short (< 3 chars)", async () => {
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

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "AB",
          destination: "Paris, France",
          timezone: "Europe/Paris",
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details[0].message).toContain("at least 3 characters");
    });

    it("should return 400 when destination is missing", async () => {
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

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Test Trip",
          timezone: "Europe/Paris",
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when timezone is missing", async () => {
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

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Test Trip",
          destination: "Paris, France",
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when endDate is before startDate", async () => {
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

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Test Trip",
          destination: "Paris, France",
          timezone: "Europe/Paris",
          startDate: "2026-06-10",
          endDate: "2026-06-01",
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details[0].message).toContain(
        "End date must be on or after start date",
      );
    });
  });

  describe("Unauthorized Cases (401)", () => {
    it("should return 401 when no token provided", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        payload: {
          name: "Test Trip",
          destination: "Paris, France",
          timezone: "Europe/Paris",
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired token",
        },
      });
    });

    it("should return 401 when invalid token provided", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: "invalid.token.here",
        },
        payload: {
          name: "Test Trip",
          destination: "Paris, France",
          timezone: "Europe/Paris",
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Forbidden Cases (403)", () => {
    it("should return 403 when user has incomplete profile (no displayName)", async () => {
      app = await buildApp();

      // Create test user with empty displayName
      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      // Generate JWT token (without name in token)
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Test Trip",
          destination: "Paris, France",
          timezone: "Europe/Paris",
        },
      });

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: "PROFILE_INCOMPLETE",
          message: "Profile setup required. Please complete your profile.",
        },
      });
    });
  });

  describe("Business Logic Errors", () => {
    it("should return 400 when co-organizer phone not found", async () => {
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

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      // Use a phone number that doesn't exist
      const nonExistentPhone = generateUniquePhone();

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Test Trip",
          destination: "Paris, France",
          timezone: "Europe/Paris",
          coOrganizerPhones: [nonExistentPhone],
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: "CO_ORGANIZER_NOT_FOUND",
          message: `Co-organizer not found: ${nonExistentPhone}`,
        },
      });
    });

    it("should return 409 when member limit exceeded", async () => {
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

      // Create 25 co-organizers (creator + 25 = 26, exceeds limit)
      const coOrgPhones: string[] = [];
      const coOrgValues = [];

      for (let i = 0; i < 25; i++) {
        const phone = generateUniquePhone();
        coOrgPhones.push(phone);
        coOrgValues.push({
          phoneNumber: phone,
          displayName: `Co-Org ${i}`,
          timezone: "UTC",
        });
      }

      await db.insert(users).values(coOrgValues);

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
        payload: {
          name: "Test Trip",
          destination: "Paris, France",
          timezone: "Europe/Paris",
          coOrganizerPhones: coOrgPhones,
        },
      });

      expect(response.statusCode).toBe(409);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: "MEMBER_LIMIT_EXCEEDED",
          message: "Member limit exceeded: maximum 25 members allowed (including creator)",
        },
      });
    });
  });
});

describe("GET /api/trips", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Success Cases", () => {
    it("should return 200 with empty array when user has no trips", async () => {
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

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: true,
        trips: [],
      });
    });

    it("should return 200 with trips array when user has trips", async () => {
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

      // Create a trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Summer Adventure",
          destination: "Paris, France",
          preferredTimezone: "Europe/Paris",
          startDate: "2026-06-01",
          endDate: "2026-06-10",
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
        method: "GET",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.trips).toHaveLength(1);
      expect(body.trips[0]).toMatchObject({
        id: trip.id,
        name: "Summer Adventure",
        destination: "Paris, France",
        startDate: "2026-06-01",
        endDate: "2026-06-10",
        isOrganizer: true,
        rsvpStatus: "going",
        memberCount: 1,
        eventCount: 0,
      });
      expect(body.trips[0]).toHaveProperty("coverImageUrl");
      expect(body.trips[0]).toHaveProperty("organizerInfo");
      expect(Array.isArray(body.trips[0].organizerInfo)).toBe(true);
    });

    it("should return 200 with multiple trips ordered by startDate", async () => {
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

      // Create trips with different start dates
      const trip1Result = await db
        .insert(trips)
        .values({
          name: "Trip 1 - Later",
          destination: "Tokyo, Japan",
          preferredTimezone: "Asia/Tokyo",
          startDate: "2026-08-01",
          createdBy: testUser.id,
        })
        .returning();

      const trip2Result = await db
        .insert(trips)
        .values({
          name: "Trip 2 - Earlier",
          destination: "London, UK",
          preferredTimezone: "Europe/London",
          startDate: "2026-06-01",
          createdBy: testUser.id,
        })
        .returning();

      // Add user as member to both trips
      await db.insert(members).values([
        {
          tripId: trip1Result[0].id,
          userId: testUser.id,
          status: "going",
        },
        {
          tripId: trip2Result[0].id,
          userId: testUser.id,
          status: "going",
        },
      ]);

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.trips).toHaveLength(2);
      // Should be ordered by startDate, so earlier trip first
      expect(body.trips[0].name).toBe("Trip 2 - Earlier");
      expect(body.trips[1].name).toBe("Trip 1 - Later");
    });

    it("should not return cancelled trips", async () => {
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

      // Create active trip
      const activeTripResult = await db
        .insert(trips)
        .values({
          name: "Active Trip",
          destination: "Paris, France",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
          cancelled: false,
        })
        .returning();

      // Create cancelled trip
      const cancelledTripResult = await db
        .insert(trips)
        .values({
          name: "Cancelled Trip",
          destination: "Berlin, Germany",
          preferredTimezone: "Europe/Berlin",
          createdBy: testUser.id,
          cancelled: true,
        })
        .returning();

      // Add user as member to both trips
      await db.insert(members).values([
        {
          tripId: activeTripResult[0].id,
          userId: testUser.id,
          status: "going",
        },
        {
          tripId: cancelledTripResult[0].id,
          userId: testUser.id,
          status: "going",
        },
      ]);

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/trips",
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.trips).toHaveLength(1);
      expect(body.trips[0].name).toBe("Active Trip");
    });
  });

  describe("Unauthorized Cases (401)", () => {
    it("should return 401 when no token provided", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "GET",
        url: "/api/trips",
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired token",
        },
      });
    });

    it("should return 401 when invalid token provided", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "GET",
        url: "/api/trips",
        cookies: {
          auth_token: "invalid.token.here",
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
