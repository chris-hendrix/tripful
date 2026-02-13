import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../helpers.js";
import { db } from "@/config/database.js";
import { users, trips, members, invitations } from "@/db/schema/index.js";
import { and, eq } from "drizzle-orm";
import { generateUniquePhone } from "../test-utils.js";

describe("Invitation Routes", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("POST /api/trips/:tripId/invitations", () => {
    it("should create invitations and return 201", async () => {
      app = await buildApp();

      // Create organizer user with complete profile
      const organizerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const organizer = organizerResult[0];

      // Create a trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Paris",
          preferredTimezone: "Europe/Paris",
          createdBy: organizer.id,
        })
        .returning();

      const trip = tripResult[0];

      // Add organizer as member with isOrganizer=true
      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      // Generate JWT token
      const token = app.jwt.sign({
        sub: organizer.id,
        phone: organizer.phoneNumber,
        name: organizer.displayName,
      });

      const phone1 = generateUniquePhone();
      const phone2 = generateUniquePhone();

      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/invitations`,
        cookies: {
          auth_token: token,
        },
        payload: {
          phoneNumbers: [phone1, phone2],
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("invitations");
      expect(body.invitations).toHaveLength(2);
      expect(body).toHaveProperty("skipped");
      expect(body.skipped).toHaveLength(0);
    });

    it("should skip already-invited phone numbers", async () => {
      app = await buildApp();

      // Create organizer user
      const organizerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const organizer = organizerResult[0];

      // Create a trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Tokyo",
          preferredTimezone: "Asia/Tokyo",
          createdBy: organizer.id,
        })
        .returning();

      const trip = tripResult[0];

      // Add organizer as member
      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      const token = app.jwt.sign({
        sub: organizer.id,
        phone: organizer.phoneNumber,
        name: organizer.displayName,
      });

      const phone1 = generateUniquePhone();
      const phone2 = generateUniquePhone();

      // First invitation
      await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/invitations`,
        cookies: {
          auth_token: token,
        },
        payload: {
          phoneNumbers: [phone1, phone2],
        },
      });

      // Second invitation with same phones
      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/invitations`,
        cookies: {
          auth_token: token,
        },
        payload: {
          phoneNumbers: [phone1, phone2],
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body.invitations).toHaveLength(0);
      expect(body.skipped).toHaveLength(2);
      expect(body.skipped).toContain(phone1);
      expect(body.skipped).toContain(phone2);
    });

    it("should return 403 if not an organizer", async () => {
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
          destination: "London",
          preferredTimezone: "Europe/London",
          createdBy: owner.id,
        })
        .returning();

      const trip = tripResult[0];

      // Add owner as organizer member
      await db.insert(members).values({
        tripId: trip.id,
        userId: owner.id,
        status: "going",
        isOrganizer: true,
      });

      // Create regular member
      const memberResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Regular Member",
          timezone: "UTC",
        })
        .returning();

      const regularMember = memberResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: regularMember.id,
        status: "going",
        isOrganizer: false,
      });

      const token = app.jwt.sign({
        sub: regularMember.id,
        phone: regularMember.phoneNumber,
        name: regularMember.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/invitations`,
        cookies: {
          auth_token: token,
        },
        payload: {
          phoneNumbers: [generateUniquePhone()],
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 401 if not authenticated", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/trips/550e8400-e29b-41d4-a716-446655440000/invitations",
        payload: {
          phoneNumbers: ["+14155551234"],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 400 for invalid phone numbers", async () => {
      app = await buildApp();

      // Create organizer user
      const organizerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const organizer = organizerResult[0];

      // Create a trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Berlin",
          preferredTimezone: "Europe/Berlin",
          createdBy: organizer.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      const token = app.jwt.sign({
        sub: organizer.id,
        phone: organizer.phoneNumber,
        name: organizer.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/invitations`,
        cookies: {
          auth_token: token,
        },
        payload: {
          phoneNumbers: ["not-a-phone", "12345"],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/trips/:tripId/invitations", () => {
    it("should return invitations for organizer", async () => {
      app = await buildApp();

      // Create organizer
      const organizerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const organizer = organizerResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Rome",
          preferredTimezone: "Europe/Rome",
          createdBy: organizer.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      // Create some invitations
      await db.insert(invitations).values([
        {
          tripId: trip.id,
          inviterId: organizer.id,
          inviteePhone: generateUniquePhone(),
          status: "pending",
        },
        {
          tripId: trip.id,
          inviterId: organizer.id,
          inviteePhone: generateUniquePhone(),
          status: "pending",
        },
      ]);

      const token = app.jwt.sign({
        sub: organizer.id,
        phone: organizer.phoneNumber,
        name: organizer.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${trip.id}/invitations`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("invitations");
      expect(body.invitations).toHaveLength(2);
    });

    it("should return 403 for non-organizer", async () => {
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
          name: "Test Trip",
          destination: "Madrid",
          preferredTimezone: "Europe/Madrid",
          createdBy: owner.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: owner.id,
        status: "going",
        isOrganizer: true,
      });

      // Create regular member
      const memberResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Regular Member",
          timezone: "UTC",
        })
        .returning();

      const regularMember = memberResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: regularMember.id,
        status: "going",
        isOrganizer: false,
      });

      const token = app.jwt.sign({
        sub: regularMember.id,
        phone: regularMember.phoneNumber,
        name: regularMember.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${trip.id}/invitations`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 401 if not authenticated", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "GET",
        url: "/api/trips/550e8400-e29b-41d4-a716-446655440000/invitations",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /api/invitations/:id", () => {
    it("should revoke invitation and return 200", async () => {
      app = await buildApp();

      // Create organizer
      const organizerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const organizer = organizerResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Barcelona",
          preferredTimezone: "Europe/Madrid",
          createdBy: organizer.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      // Create an invitation
      const invitationResult = await db
        .insert(invitations)
        .values({
          tripId: trip.id,
          inviterId: organizer.id,
          inviteePhone: generateUniquePhone(),
          status: "pending",
        })
        .returning();

      const invitation = invitationResult[0];

      const token = app.jwt.sign({
        sub: organizer.id,
        phone: organizer.phoneNumber,
        name: organizer.displayName,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/invitations/${invitation.id}`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent invitation", async () => {
      app = await buildApp();

      // Create user
      const userResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = userResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "DELETE",
        url: "/api/invitations/550e8400-e29b-41d4-a716-446655440000",
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 403 for non-organizer", async () => {
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
          name: "Test Trip",
          destination: "Vienna",
          preferredTimezone: "Europe/Vienna",
          createdBy: owner.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: owner.id,
        status: "going",
        isOrganizer: true,
      });

      // Create an invitation
      const invitationResult = await db
        .insert(invitations)
        .values({
          tripId: trip.id,
          inviterId: owner.id,
          inviteePhone: generateUniquePhone(),
          status: "pending",
        })
        .returning();

      const invitation = invitationResult[0];

      // Create regular member
      const memberResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Regular Member",
          timezone: "UTC",
        })
        .returning();

      const regularMember = memberResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: regularMember.id,
        status: "going",
        isOrganizer: false,
      });

      const token = app.jwt.sign({
        sub: regularMember.id,
        phone: regularMember.phoneNumber,
        name: regularMember.displayName,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/invitations/${invitation.id}`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 401 if not authenticated", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "DELETE",
        url: "/api/invitations/550e8400-e29b-41d4-a716-446655440000",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /api/trips/:tripId/rsvp", () => {
    it("should update RSVP status to going", async () => {
      app = await buildApp();

      // Create user
      const userResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = userResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Amsterdam",
          preferredTimezone: "Europe/Amsterdam",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "no_response",
        isOrganizer: true,
      });

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/rsvp`,
        cookies: {
          auth_token: token,
        },
        payload: {
          status: "going",
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("member");
      expect(body.member.status).toBe("going");
      expect(body.member.userId).toBe(testUser.id);
    });

    it("should update RSVP status to maybe", async () => {
      app = await buildApp();

      // Create user
      const userResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = userResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Prague",
          preferredTimezone: "Europe/Prague",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "no_response",
        isOrganizer: true,
      });

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/rsvp`,
        cookies: {
          auth_token: token,
        },
        payload: {
          status: "maybe",
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("member");
      expect(body.member.status).toBe("maybe");
    });

    it("should update RSVP status to not_going", async () => {
      app = await buildApp();

      // Create user
      const userResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = userResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Budapest",
          preferredTimezone: "Europe/Budapest",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "going",
        isOrganizer: true,
      });

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/rsvp`,
        cookies: {
          auth_token: token,
        },
        payload: {
          status: "not_going",
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("member");
      expect(body.member.status).toBe("not_going");
    });

    it("should return 403 for non-member", async () => {
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
          name: "Test Trip",
          destination: "Dublin",
          preferredTimezone: "Europe/Dublin",
          createdBy: owner.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: owner.id,
        status: "going",
        isOrganizer: true,
      });

      // Create non-member user
      const nonMemberResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Non Member",
          timezone: "UTC",
        })
        .returning();

      const nonMember = nonMemberResult[0];

      const token = app.jwt.sign({
        sub: nonMember.id,
        phone: nonMember.phoneNumber,
        name: nonMember.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/rsvp`,
        cookies: {
          auth_token: token,
        },
        payload: {
          status: "going",
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 400 for invalid status", async () => {
      app = await buildApp();

      // Create user
      const userResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = userResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Lisbon",
          preferredTimezone: "Europe/Lisbon",
          createdBy: testUser.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: testUser.id,
        status: "going",
        isOrganizer: true,
      });

      const token = app.jwt.sign({
        sub: testUser.id,
        phone: testUser.phoneNumber,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/trips/${trip.id}/rsvp`,
        cookies: {
          auth_token: token,
        },
        payload: {
          status: "invalid",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 401 if not authenticated", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/trips/550e8400-e29b-41d4-a716-446655440000/rsvp",
        payload: {
          status: "going",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /api/trips/:tripId/members/:memberId", () => {
    it("should remove member and return 204", async () => {
      app = await buildApp();

      // Create organizer
      const organizerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const organizer = organizerResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Bali",
          preferredTimezone: "Asia/Makassar",
          createdBy: organizer.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      // Create a regular member
      const memberResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Regular Member",
          timezone: "UTC",
        })
        .returning();

      const regularMember = memberResult[0];

      const [memberRecord] = await db
        .insert(members)
        .values({
          tripId: trip.id,
          userId: regularMember.id,
          status: "going",
          isOrganizer: false,
        })
        .returning();

      const token = app.jwt.sign({
        sub: organizer.id,
        phone: organizer.phoneNumber,
        name: organizer.displayName,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/trips/${trip.id}/members/${memberRecord.id}`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(204);
    });

    it("should return 403 for non-organizer", async () => {
      app = await buildApp();

      // Create organizer
      const organizerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const organizer = organizerResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Cancun",
          preferredTimezone: "America/Cancun",
          createdBy: organizer.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      // Create regular member (the one who will try to remove)
      const memberResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Regular Member",
          timezone: "UTC",
        })
        .returning();

      const regularMember = memberResult[0];

      await db
        .insert(members)
        .values({
          tripId: trip.id,
          userId: regularMember.id,
          status: "going",
          isOrganizer: false,
        });

      // Create another member to be the target
      const targetResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Target Member",
          timezone: "UTC",
        })
        .returning();

      const targetMember = targetResult[0];

      const [targetRecord] = await db
        .insert(members)
        .values({
          tripId: trip.id,
          userId: targetMember.id,
          status: "going",
          isOrganizer: false,
        })
        .returning();

      const token = app.jwt.sign({
        sub: regularMember.id,
        phone: regularMember.phoneNumber,
        name: regularMember.displayName,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/trips/${trip.id}/members/${targetRecord.id}`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 400 when trying to remove trip creator", async () => {
      app = await buildApp();

      // Create organizer (who is the creator)
      const organizerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Creator",
          timezone: "UTC",
        })
        .returning();

      const creator = organizerResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Dubai",
          preferredTimezone: "Asia/Dubai",
          createdBy: creator.id,
        })
        .returning();

      const trip = tripResult[0];

      const [creatorMemberRecord] = await db
        .insert(members)
        .values({
          tripId: trip.id,
          userId: creator.id,
          status: "going",
          isOrganizer: true,
        })
        .returning();

      // Add a second organizer who will attempt the removal
      const secondOrgResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Second Organizer",
          timezone: "UTC",
        })
        .returning();

      const secondOrg = secondOrgResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: secondOrg.id,
        status: "going",
        isOrganizer: true,
      });

      const token = app.jwt.sign({
        sub: secondOrg.id,
        phone: secondOrg.phoneNumber,
        name: secondOrg.displayName,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/trips/${trip.id}/members/${creatorMemberRecord.id}`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 404 for non-existent member", async () => {
      app = await buildApp();

      // Create organizer
      const organizerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const organizer = organizerResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Fiji",
          preferredTimezone: "Pacific/Fiji",
          createdBy: organizer.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      const token = app.jwt.sign({
        sub: organizer.id,
        phone: organizer.phoneNumber,
        name: organizer.displayName,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/trips/${trip.id}/members/550e8400-e29b-41d4-a716-446655440000`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 401 if not authenticated", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "DELETE",
        url: "/api/trips/550e8400-e29b-41d4-a716-446655440000/members/550e8400-e29b-41d4-a716-446655440001",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 400 when trying to remove last organizer", async () => {
      app = await buildApp();

      // Create trip creator
      const creatorResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Creator",
          timezone: "UTC",
        })
        .returning();

      const creator = creatorResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Iceland",
          preferredTimezone: "Atlantic/Reykjavik",
          createdBy: creator.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: creator.id,
        status: "going",
        isOrganizer: true,
      });

      // Add a co-organizer (not the creator) as the sole other organizer
      const coOrgResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Co-Organizer",
          timezone: "UTC",
        })
        .returning();

      const coOrg = coOrgResult[0];

      const [coOrgMember] = await db
        .insert(members)
        .values({
          tripId: trip.id,
          userId: coOrg.id,
          status: "going",
          isOrganizer: true,
        })
        .returning();

      // Demote creator so coOrg is the last organizer
      await db
        .update(members)
        .set({ isOrganizer: false })
        .where(
          and(eq(members.tripId, trip.id), eq(members.userId, creator.id)),
        );

      // coOrg tries to remove themselves (they are the last organizer)
      const token = app.jwt.sign({
        sub: coOrg.id,
        phone: coOrg.phoneNumber,
        name: coOrg.displayName,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/trips/${trip.id}/members/${coOrgMember.id}`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/trips/:tripId/members", () => {
    it("should return members for a trip member", async () => {
      app = await buildApp();

      // Create organizer
      const organizerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const organizer = organizerResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Athens",
          preferredTimezone: "Europe/Athens",
          createdBy: organizer.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      // Create second member
      const member2Result = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Member Two",
          timezone: "UTC",
        })
        .returning();

      const member2 = member2Result[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: member2.id,
        status: "going",
        isOrganizer: false,
      });

      const token = app.jwt.sign({
        sub: member2.id,
        phone: member2.phoneNumber,
        name: member2.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${trip.id}/members`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("members");
      expect(body.members).toHaveLength(2);
    });

    it("should include phone numbers for organizer", async () => {
      app = await buildApp();

      // Create organizer
      const organizerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const organizer = organizerResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Helsinki",
          preferredTimezone: "Europe/Helsinki",
          createdBy: organizer.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      // Create second member
      const member2Result = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Member Two",
          timezone: "UTC",
        })
        .returning();

      const member2 = member2Result[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: member2.id,
        status: "going",
        isOrganizer: false,
      });

      const token = app.jwt.sign({
        sub: organizer.id,
        phone: organizer.phoneNumber,
        name: organizer.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${trip.id}/members`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.members).toHaveLength(2);

      // Organizer should see phone numbers
      for (const member of body.members) {
        expect(member).toHaveProperty("phoneNumber");
        expect(member.phoneNumber).toBeDefined();
      }
    });

    it("should exclude phone numbers for non-organizer", async () => {
      app = await buildApp();

      // Create organizer
      const organizerResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Organizer",
          timezone: "UTC",
        })
        .returning();

      const organizer = organizerResult[0];

      // Create trip
      const tripResult = await db
        .insert(trips)
        .values({
          name: "Test Trip",
          destination: "Oslo",
          preferredTimezone: "Europe/Oslo",
          createdBy: organizer.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      });

      // Create regular member
      const memberResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Regular Member",
          timezone: "UTC",
        })
        .returning();

      const regularMember = memberResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: regularMember.id,
        status: "going",
        isOrganizer: false,
      });

      const token = app.jwt.sign({
        sub: regularMember.id,
        phone: regularMember.phoneNumber,
        name: regularMember.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${trip.id}/members`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.members).toHaveLength(2);

      // Non-organizer should NOT see phone numbers
      for (const member of body.members) {
        expect(member.phoneNumber).toBeUndefined();
      }
    });

    it("should return 403 for non-member", async () => {
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
          name: "Test Trip",
          destination: "Stockholm",
          preferredTimezone: "Europe/Stockholm",
          createdBy: owner.id,
        })
        .returning();

      const trip = tripResult[0];

      await db.insert(members).values({
        tripId: trip.id,
        userId: owner.id,
        status: "going",
        isOrganizer: true,
      });

      // Create non-member user
      const nonMemberResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Non Member",
          timezone: "UTC",
        })
        .returning();

      const nonMember = nonMemberResult[0];

      const token = app.jwt.sign({
        sub: nonMember.id,
        phone: nonMember.phoneNumber,
        name: nonMember.displayName,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/trips/${trip.id}/members`,
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 401 if not authenticated", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "GET",
        url: "/api/trips/550e8400-e29b-41d4-a716-446655440000/members",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
