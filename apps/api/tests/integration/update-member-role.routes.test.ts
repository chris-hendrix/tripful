import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../helpers.js";
import { db } from "@/config/database.js";
import { users, trips, members } from "@/db/schema/index.js";

import { generateUniquePhone } from "../test-utils.js";

describe("PATCH /api/trips/:tripId/members/:memberId", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("should promote a member to co-organizer and return 200", async () => {
    app = await buildApp();

    // Create organizer (trip creator)
    const [organizer] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Organizer",
        timezone: "UTC",
      })
      .returning();

    // Create trip
    const [trip] = await db
      .insert(trips)
      .values({
        name: "Test Trip",
        destination: "Paris",
        preferredTimezone: "Europe/Paris",
        createdBy: organizer.id,
      })
      .returning();

    // Add organizer as member
    await db.insert(members).values({
      tripId: trip.id,
      userId: organizer.id,
      status: "going",
      isOrganizer: true,
    });

    // Create regular member
    const [regularMember] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Regular Member",
        timezone: "UTC",
      })
      .returning();

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
      name: organizer.displayName,
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/trips/${trip.id}/members/${memberRecord.id}`,
      cookies: {
        auth_token: token,
      },
      payload: {
        isOrganizer: true,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("member");
    expect(body.member.isOrganizer).toBe(true);
    expect(body.member.userId).toBe(regularMember.id);
    expect(body.member.displayName).toBe("Regular Member");
  });

  it("should demote a co-organizer to regular member and return 200", async () => {
    app = await buildApp();

    // Create organizer (trip creator)
    const [organizer] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Organizer",
        timezone: "UTC",
      })
      .returning();

    // Create trip
    const [trip] = await db
      .insert(trips)
      .values({
        name: "Test Trip",
        destination: "Tokyo",
        preferredTimezone: "Asia/Tokyo",
        createdBy: organizer.id,
      })
      .returning();

    // Add organizer as member
    await db.insert(members).values({
      tripId: trip.id,
      userId: organizer.id,
      status: "going",
      isOrganizer: true,
    });

    // Create co-organizer member
    const [coOrg] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Co-Organizer",
        timezone: "UTC",
      })
      .returning();

    const [coOrgRecord] = await db
      .insert(members)
      .values({
        tripId: trip.id,
        userId: coOrg.id,
        status: "going",
        isOrganizer: true,
      })
      .returning();

    const token = app.jwt.sign({
      sub: organizer.id,
      name: organizer.displayName,
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/trips/${trip.id}/members/${coOrgRecord.id}`,
      cookies: {
        auth_token: token,
      },
      payload: {
        isOrganizer: false,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("success", true);
    expect(body.member.isOrganizer).toBe(false);
    expect(body.member.userId).toBe(coOrg.id);
  });

  it("should return 403 for non-organizer", async () => {
    app = await buildApp();

    // Create trip owner
    const [owner] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Owner",
        timezone: "UTC",
      })
      .returning();

    // Create trip
    const [trip] = await db
      .insert(trips)
      .values({
        name: "Test Trip",
        destination: "London",
        preferredTimezone: "Europe/London",
        createdBy: owner.id,
      })
      .returning();

    await db.insert(members).values({
      tripId: trip.id,
      userId: owner.id,
      status: "going",
      isOrganizer: true,
    });

    // Create regular member (will try to promote someone)
    const [regularMember] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Regular Member",
        timezone: "UTC",
      })
      .returning();

    await db.insert(members).values({
      tripId: trip.id,
      userId: regularMember.id,
      status: "going",
      isOrganizer: false,
    });

    // Create another member (the target)
    const [target] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Target Member",
        timezone: "UTC",
      })
      .returning();

    const [targetRecord] = await db
      .insert(members)
      .values({
        tripId: trip.id,
        userId: target.id,
        status: "going",
        isOrganizer: false,
      })
      .returning();

    const token = app.jwt.sign({
      sub: regularMember.id,
      name: regularMember.displayName,
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/trips/${trip.id}/members/${targetRecord.id}`,
      cookies: {
        auth_token: token,
      },
      payload: {
        isOrganizer: true,
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it("should return 400 when trying to change trip creator role", async () => {
    app = await buildApp();

    // Create trip creator
    const [creator] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Creator",
        timezone: "UTC",
      })
      .returning();

    // Create trip
    const [trip] = await db
      .insert(trips)
      .values({
        name: "Test Trip",
        destination: "Berlin",
        preferredTimezone: "Europe/Berlin",
        createdBy: creator.id,
      })
      .returning();

    const [creatorMemberRecord] = await db
      .insert(members)
      .values({
        tripId: trip.id,
        userId: creator.id,
        status: "going",
        isOrganizer: true,
      })
      .returning();

    // Add a second organizer who will attempt the change
    const [secondOrg] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Second Organizer",
        timezone: "UTC",
      })
      .returning();

    await db.insert(members).values({
      tripId: trip.id,
      userId: secondOrg.id,
      status: "going",
      isOrganizer: true,
    });

    const token = app.jwt.sign({
      sub: secondOrg.id,
      name: secondOrg.displayName,
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/trips/${trip.id}/members/${creatorMemberRecord.id}`,
      cookies: {
        auth_token: token,
      },
      payload: {
        isOrganizer: false,
      },
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe("CANNOT_DEMOTE_CREATOR");
  });

  it("should return 400 when trying to modify own role", async () => {
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

    // Create trip
    const [trip] = await db
      .insert(trips)
      .values({
        name: "Test Trip",
        destination: "Rome",
        preferredTimezone: "Europe/Rome",
        createdBy: organizer.id,
      })
      .returning();

    const [organizerRecord] = await db
      .insert(members)
      .values({
        tripId: trip.id,
        userId: organizer.id,
        status: "going",
        isOrganizer: true,
      })
      .returning();

    const token = app.jwt.sign({
      sub: organizer.id,
      name: organizer.displayName,
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/trips/${trip.id}/members/${organizerRecord.id}`,
      cookies: {
        auth_token: token,
      },
      payload: {
        isOrganizer: false,
      },
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe("CANNOT_MODIFY_OWN_ROLE");
  });

  it("should return 404 for non-existent member", async () => {
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

    // Create trip
    const [trip] = await db
      .insert(trips)
      .values({
        name: "Test Trip",
        destination: "Madrid",
        preferredTimezone: "Europe/Madrid",
        createdBy: organizer.id,
      })
      .returning();

    await db.insert(members).values({
      tripId: trip.id,
      userId: organizer.id,
      status: "going",
      isOrganizer: true,
    });

    const token = app.jwt.sign({
      sub: organizer.id,
      name: organizer.displayName,
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/trips/${trip.id}/members/550e8400-e29b-41d4-a716-446655440000`,
      cookies: {
        auth_token: token,
      },
      payload: {
        isOrganizer: true,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 if not authenticated", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "PATCH",
      url: "/api/trips/550e8400-e29b-41d4-a716-446655440000/members/550e8400-e29b-41d4-a716-446655440001",
      payload: {
        isOrganizer: true,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 400 for invalid body", async () => {
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

    // Create trip
    const [trip] = await db
      .insert(trips)
      .values({
        name: "Test Trip",
        destination: "Vienna",
        preferredTimezone: "Europe/Vienna",
        createdBy: organizer.id,
      })
      .returning();

    await db.insert(members).values({
      tripId: trip.id,
      userId: organizer.id,
      status: "going",
      isOrganizer: true,
    });

    const token = app.jwt.sign({
      sub: organizer.id,
      name: organizer.displayName,
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/trips/${trip.id}/members/550e8400-e29b-41d4-a716-446655440000`,
      cookies: {
        auth_token: token,
      },
      payload: {
        isOrganizer: "not-a-boolean",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 when demoting the last organizer", async () => {
    app = await buildApp();

    // Create trip creator
    const [creator] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Creator",
        timezone: "UTC",
      })
      .returning();

    // Create trip
    const [trip] = await db
      .insert(trips)
      .values({
        name: "Test Trip",
        destination: "Helsinki",
        preferredTimezone: "Europe/Helsinki",
        createdBy: creator.id,
      })
      .returning();

    // Creator as member but NOT organizer
    await db.insert(members).values({
      tripId: trip.id,
      userId: creator.id,
      status: "going",
      isOrganizer: false,
    });

    // Create a co-organizer who is the sole organizer
    const [coOrg] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Co-Organizer",
        timezone: "UTC",
      })
      .returning();

    const [coOrgRecord] = await db
      .insert(members)
      .values({
        tripId: trip.id,
        userId: coOrg.id,
        status: "going",
        isOrganizer: true,
      })
      .returning();

    // Creator can make the request because permissionsService.isOrganizer
    // checks if user is trip creator
    const token = app.jwt.sign({
      sub: creator.id,
      name: creator.displayName,
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/trips/${trip.id}/members/${coOrgRecord.id}`,
      cookies: {
        auth_token: token,
      },
      payload: {
        isOrganizer: false,
      },
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe("LAST_ORGANIZER");
  });

  it("should return 400 for invalid tripId format", async () => {
    app = await buildApp();

    // Create a user for auth
    const [user] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Test User",
        timezone: "UTC",
      })
      .returning();

    const token = app.jwt.sign({
      sub: user.id,
      name: user.displayName,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/trips/not-a-uuid/members/550e8400-e29b-41d4-a716-446655440000",
      cookies: {
        auth_token: token,
      },
      payload: {
        isOrganizer: true,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
