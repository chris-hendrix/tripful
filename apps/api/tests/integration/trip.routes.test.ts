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

describe("GET /api/trips/:id", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) await app.close();
  });

  describe("Success Cases", () => {
    it("should return 200 with trip details when user is member", async () => {
      app = await buildApp();

      // Create test user
      const phone = generateUniquePhone();
      const [user] = await db
        .insert(users)
        .values({
          phoneNumber: phone,
          displayName: "Test Member",
          timezone: "UTC",
        })
        .returning();

      // Create trip
      const [trip] = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris, France",
          preferredTimezone: "Europe/Paris",
          description: "A test trip",
          startDate: "2026-06-01",
          endDate: "2026-06-07",
          createdBy: user.id,
        })
        .returning();

      // Add user as member
      await db.insert(members).values({
        tripId: trip.id,
        userId: user.id,
        status: "going",
      });

      // Generate JWT token
      const token = app.jwt.sign({
        sub: user.id,
        phoneNumber: user.phoneNumber,
      });

      // Make request
      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${trip.id}`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.trip).toBeDefined();
      expect(body.trip.id).toBe(trip.id);
      expect(body.trip.name).toBe("Test Trip");
      expect(body.trip.destination).toBe("Paris, France");
      expect(body.trip.description).toBe("A test trip");
      expect(body.trip.createdBy).toBe(user.id);
      expect(body.trip.organizers).toBeDefined();
      expect(Array.isArray(body.trip.organizers)).toBe(true);
      expect(body.trip.memberCount).toBeDefined();
      expect(typeof body.trip.memberCount).toBe("number");
      expect(body.trip.memberCount).toBe(1);
    });
  });

  describe("Error Cases", () => {
    it("should return 400 for invalid UUID format", async () => {
      app = await buildApp();

      // Create test user
      const phone = generateUniquePhone();
      const [user] = await db
        .insert(users)
        .values({
          phoneNumber: phone,
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      // Generate JWT token
      const token = app.jwt.sign({
        sub: user.id,
        phoneNumber: user.phoneNumber,
      });

      // Make request with invalid UUID
      const response = await app.inject({
        method: "GET",
        url: "/api/trips/not-a-valid-uuid",
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Invalid trip ID format");
    });

    it("should return 404 when trip does not exist", async () => {
      app = await buildApp();

      // Create test user
      const phone = generateUniquePhone();
      const [user] = await db
        .insert(users)
        .values({
          phoneNumber: phone,
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      // Generate JWT token
      const token = app.jwt.sign({
        sub: user.id,
        phoneNumber: user.phoneNumber,
      });

      // Make request with non-existent trip ID (valid UUID format)
      const nonExistentId = "550e8400-e29b-41d4-a716-446655440000";
      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${nonExistentId}`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toBe("Trip not found");
    });

    it("should return 404 when user is not a member of the trip", async () => {
      app = await buildApp();

      // Create trip organizer
      const organizerPhone = generateUniquePhone();
      const [organizer] = await db
        .insert(users)
        .values({
          phoneNumber: organizerPhone,
          displayName: "Trip Organizer",
          timezone: "UTC",
        })
        .returning();

      // Create trip
      const [trip] = await db
        .insert(trips)
        .values({
          name: "Private Trip",
          destination: "Tokyo, Japan",
          preferredTimezone: "Asia/Tokyo",
          description: "Only for members",
          startDate: "2026-07-01",
          endDate: "2026-07-07",
          createdBy: organizer.id,
        })
        .returning();

      // Add organizer as member
      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
      });

      // Create different user (not a member)
      const nonMemberPhone = generateUniquePhone();
      const [nonMember] = await db
        .insert(users)
        .values({
          phoneNumber: nonMemberPhone,
          displayName: "Non Member",
          timezone: "UTC",
        })
        .returning();

      // Generate JWT token for non-member
      const token = app.jwt.sign({
        sub: nonMember.id,
        phoneNumber: nonMember.phoneNumber,
      });

      // Make request
      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${trip.id}`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toBe("Trip not found");
    });

    it("should return 401 when no auth token is provided", async () => {
      app = await buildApp();

      // Create a trip (doesn't matter if it exists)
      const phone = generateUniquePhone();
      const [user] = await db
        .insert(users)
        .values({
          phoneNumber: phone,
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const [trip] = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Berlin, Germany",
          preferredTimezone: "Europe/Berlin",
          description: "A test trip",
          startDate: "2026-08-01",
          endDate: "2026-08-07",
          createdBy: user.id,
        })
        .returning();

      // Make request without auth token
      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${trip.id}`,
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 with invalid auth token", async () => {
      app = await buildApp();

      // Create a trip
      const phone = generateUniquePhone();
      const [user] = await db
        .insert(users)
        .values({
          phoneNumber: phone,
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const [trip] = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Berlin, Germany",
          preferredTimezone: "Europe/Berlin",
          description: "A test trip",
          startDate: "2026-08-01",
          endDate: "2026-08-07",
          createdBy: user.id,
        })
        .returning();

      // Make request with invalid token
      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${trip.id}`,
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

describe("PUT /api/trips/:id", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Success Cases", () => {
    it("should return 200 and updated trip when organizer updates trip", async () => {
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
          name: "Original Trip",
          destination: "Paris, France",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      // Add creator as organizer in members
      await db.insert(members).values({
        userId: testUser.id,
        tripId: trip.id,
        status: "going",
      });

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const updateData = {
        name: "Updated Trip Name",
        destination: "Tokyo, Japan",
        timezone: "Asia/Tokyo",
        description: "An amazing trip to Japan",
        startDate: "2026-06-01",
        endDate: "2026-06-10",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/api/trips/${trip.id}`,
        cookies: {
          auth_token: token,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.trip).toMatchObject({
        id: trip.id,
        name: "Updated Trip Name",
        destination: "Tokyo, Japan",
        preferredTimezone: "Asia/Tokyo",
        description: "An amazing trip to Japan",
        startDate: "2026-06-01",
        endDate: "2026-06-10",
      });
      expect(body.trip.updatedAt).not.toBe(trip.updatedAt.toISOString());
    });

    it("should return 200 and updated trip when co-organizer updates trip", async () => {
      app = await buildApp();

      // Create creator user
      const creatorResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Creator",
          timezone: "UTC",
        })
        .returning();

      const creator = creatorResult[0];

      // Create co-organizer user
      const coOrgResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Co-Organizer",
          timezone: "UTC",
        })
        .returning();

      const coOrg = coOrgResult[0];

      // Create a trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Original Trip",
          destination: "Paris, France",
          preferredTimezone: "Europe/Paris",
          createdBy: creator.id,
        })
        .returning();

      const trip = tripResult[0];

      // Add creator and co-organizer to members
      await db.insert(members).values([
        {
          userId: creator.id,
          tripId: trip.id,
          status: "going",
        },
        {
          userId: coOrg.id,
          tripId: trip.id,
          status: "going",
        },
      ]);

      // Generate JWT token for co-organizer
      const token = app.jwt.sign({
        sub: coOrg.id,
        phone: coOrg.phoneNumber,
        name: coOrg.displayName,
      });

      const updateData = {
        name: "Updated by Co-Org",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/api/trips/${trip.id}`,
        cookies: {
          auth_token: token,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.trip.name).toBe("Updated by Co-Org");
    });

    it("should allow partial updates (only some fields)", async () => {
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

      // Create a trip with full data
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Original Trip",
          destination: "Paris, France",
          preferredTimezone: "Europe/Paris",
          description: "Original description",
          startDate: "2026-05-01",
          endDate: "2026-05-10",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      // Add creator as organizer in members
      await db.insert(members).values({
        userId: testUser.id,
        tripId: trip.id,
        status: "going",
      });

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      // Update only the name
      const updateData = {
        name: "Only Name Changed",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/api/trips/${trip.id}`,
        cookies: {
          auth_token: token,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.trip).toMatchObject({
        id: trip.id,
        name: "Only Name Changed",
        destination: "Paris, France",
        preferredTimezone: "Europe/Paris",
        description: "Original description",
        startDate: "2026-05-01",
        endDate: "2026-05-10",
      });
    });

    it("should update updatedAt timestamp", async () => {
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
          name: "Original Trip",
          destination: "Paris, France",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];
      const originalUpdatedAt = trip.updatedAt;

      // Add creator as organizer in members
      await db.insert(members).values({
        userId: testUser.id,
        tripId: trip.id,
        status: "going",
      });

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await app.inject({
        method: "PUT",
        url: `/api/trips/${trip.id}`,
        cookies: {
          auth_token: token,
        },
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(new Date(body.trip.updatedAt).getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });
  });

  describe("Validation Errors (400)", () => {
    it("should return 400 for invalid trip ID format", async () => {
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
        method: "PUT",
        url: "/api/trips/invalid-uuid",
        cookies: {
          auth_token: token,
        },
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Invalid trip ID format");
    });

    it("should return 400 for invalid request data", async () => {
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
          name: "Test Trip",
          destination: "Paris, France",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      // Add creator as organizer in members
      await db.insert(members).values({
        userId: testUser.id,
        tripId: trip.id,
        status: "going",
      });

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: `/api/trips/${trip.id}`,
        cookies: {
          auth_token: token,
        },
        payload: {
          name: 123, // Invalid - should be string
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Invalid request data");
      expect(body.error.details).toBeDefined();
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

      // Create a trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris, France",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      // Add creator as organizer in members
      await db.insert(members).values({
        userId: testUser.id,
        tripId: trip.id,
        status: "going",
      });

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: `/api/trips/${trip.id}`,
        cookies: {
          auth_token: token,
        },
        payload: {
          startDate: "2026-06-10",
          endDate: "2026-06-01",
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Unauthorized Cases (401)", () => {
    it("should return 401 when no auth token provided", async () => {
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
          name: "Test Trip",
          destination: "Paris, France",
          preferredTimezone: "Europe/Paris",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      const response = await app.inject({
        method: "PUT",
        url: `/api/trips/${trip.id}`,
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Forbidden Cases (403)", () => {
    it("should return 403 when non-organizer tries to update trip", async () => {
      app = await buildApp();

      // Create creator user
      const creatorResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Creator",
          timezone: "UTC",
        })
        .returning();

      const creator = creatorResult[0];

      // Create another user (not part of the trip)
      const otherUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Other User",
          timezone: "UTC",
        })
        .returning();

      const otherUser = otherUserResult[0];

      // Create a trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris, France",
          preferredTimezone: "Europe/Paris",
          createdBy: creator.id,
        })
        .returning();

      const trip = tripResult[0];

      // Add creator as organizer in members
      await db.insert(members).values({
        userId: creator.id,
        tripId: trip.id,
        status: "going",
      });

      // Generate JWT token for the other user
      const token = app.jwt.sign({
        sub: otherUser.id,
        phone: otherUser.phoneNumber,
        name: otherUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: `/api/trips/${trip.id}`,
        cookies: {
          auth_token: token,
        },
        payload: { name: "Trying to Update" },
      });

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("PERMISSION_DENIED");
      expect(body.error.message).toBe(
        "Permission denied: only organizers can update trips",
      );
    });

    it("should return 403 when regular member tries to update trip", async () => {
      app = await buildApp();

      // Create creator user
      const creatorResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Creator",
          timezone: "UTC",
        })
        .returning();

      const creator = creatorResult[0];

      // Create member user
      const memberResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Member",
          timezone: "UTC",
        })
        .returning();

      const member = memberResult[0];

      // Create a trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris, France",
          preferredTimezone: "Europe/Paris",
          createdBy: creator.id,
        })
        .returning();

      const trip = tripResult[0];

      // Add creator as organizer and other user as regular member
      await db.insert(members).values([
        {
          userId: creator.id,
          tripId: trip.id,
          status: "going",
        },
        {
          userId: member.id,
          tripId: trip.id,
          status: "no_response",
        },
      ]);

      // Generate JWT token for the member
      const token = app.jwt.sign({
        sub: member.id,
        phone: member.phoneNumber,
        name: member.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: `/api/trips/${trip.id}`,
        cookies: {
          auth_token: token,
        },
        payload: { name: "Trying to Update" },
      });

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("PERMISSION_DENIED");
    });
  });

  describe("Not Found Cases (404)", () => {
    it("should return 404 when trip does not exist", async () => {
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

      // Use a valid UUID that doesn't exist
      const nonExistentId = "550e8400-e29b-41d4-a716-446655440000";

      const response = await app.inject({
        method: "PUT",
        url: `/api/trips/${nonExistentId}`,
        cookies: {
          auth_token: token,
        },
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toBe("Trip not found");
    });
  });
});
