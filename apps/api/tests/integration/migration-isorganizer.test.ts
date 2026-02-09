import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/config/database.js";
import { trips, members, users } from "@/db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { generateUniquePhone } from "../test-utils.js";

describe("isOrganizer column", () => {
  let creatorPhone: string;
  let memberPhone: string;
  let creatorId: string;
  let memberId: string;
  let tripId: string;

  const cleanup = async () => {
    if (tripId) {
      await db.delete(members).where(eq(members.tripId, tripId));
      await db.delete(trips).where(eq(trips.id, tripId));
    }
    const phones = [creatorPhone, memberPhone].filter(Boolean);
    for (const phone of phones) {
      await db.delete(users).where(eq(users.phoneNumber, phone));
    }
  };

  beforeEach(async () => {
    creatorPhone = generateUniquePhone();
    memberPhone = generateUniquePhone();
    await cleanup();

    // Create users
    const [creator] = await db
      .insert(users)
      .values({
        phoneNumber: creatorPhone,
        displayName: "Trip Creator",
      })
      .returning();
    creatorId = creator.id;

    const [member] = await db
      .insert(users)
      .values({
        phoneNumber: memberPhone,
        displayName: "Regular Member",
      })
      .returning();
    memberId = member.id;

    // Create trip
    const [trip] = await db
      .insert(trips)
      .values({
        name: "Test Trip",
        destination: "Test Destination",
        startDate: new Date("2026-06-01").toISOString(),
        endDate: new Date("2026-06-07").toISOString(),
        preferredTimezone: "America/New_York",
        createdBy: creatorId,
      })
      .returning();
    tripId = trip.id;
  });

  afterEach(cleanup);

  it("should default isOrganizer to false for new members", async () => {
    const [member] = await db
      .insert(members)
      .values({
        tripId,
        userId: memberId,
        status: "going",
      })
      .returning();

    expect(member.isOrganizer).toBe(false);
  });

  it("should allow setting isOrganizer to true", async () => {
    const [member] = await db
      .insert(members)
      .values({
        tripId,
        userId: creatorId,
        status: "going",
        isOrganizer: true,
      })
      .returning();

    expect(member.isOrganizer).toBe(true);
  });

  it("should be queryable by isOrganizer flag", async () => {
    // Insert organizer
    await db.insert(members).values({
      tripId,
      userId: creatorId,
      status: "going",
      isOrganizer: true,
    });

    // Insert regular member
    await db.insert(members).values({
      tripId,
      userId: memberId,
      status: "going",
      isOrganizer: false,
    });

    const organizers = await db
      .select()
      .from(members)
      .where(and(eq(members.tripId, tripId), eq(members.isOrganizer, true)));

    expect(organizers).toHaveLength(1);
    expect(organizers[0].userId).toBe(creatorId);

    const nonOrganizers = await db
      .select()
      .from(members)
      .where(and(eq(members.tripId, tripId), eq(members.isOrganizer, false)));

    expect(nonOrganizers).toHaveLength(1);
    expect(nonOrganizers[0].userId).toBe(memberId);
  });
});
