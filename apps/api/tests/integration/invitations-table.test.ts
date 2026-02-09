import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/config/database.js";
import { trips, members, users, invitations } from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { generateUniquePhone } from "../test-utils.js";

describe("invitations table", () => {
  let inviterPhone: string;
  let inviterId: string;
  let tripId: string;

  const cleanup = async () => {
    if (tripId) {
      await db.delete(invitations).where(eq(invitations.tripId, tripId));
      await db.delete(members).where(eq(members.tripId, tripId));
      await db.delete(trips).where(eq(trips.id, tripId));
    }
    if (inviterPhone) {
      await db.delete(users).where(eq(users.phoneNumber, inviterPhone));
    }
  };

  beforeEach(async () => {
    inviterPhone = generateUniquePhone();
    await cleanup();

    const [inviter] = await db
      .insert(users)
      .values({
        phoneNumber: inviterPhone,
        displayName: "Inviter",
      })
      .returning();
    inviterId = inviter.id;

    const [trip] = await db
      .insert(trips)
      .values({
        name: "Test Trip",
        destination: "Test Destination",
        startDate: new Date("2026-06-01").toISOString(),
        endDate: new Date("2026-06-07").toISOString(),
        preferredTimezone: "America/New_York",
        createdBy: inviterId,
      })
      .returning();
    tripId = trip.id;
  });

  afterEach(cleanup);

  it("should create an invitation record", async () => {
    const inviteePhone = generateUniquePhone();
    const [invitation] = await db
      .insert(invitations)
      .values({
        tripId,
        inviterId,
        inviteePhone,
      })
      .returning();

    expect(invitation.id).toBeDefined();
    expect(invitation.tripId).toBe(tripId);
    expect(invitation.inviterId).toBe(inviterId);
    expect(invitation.inviteePhone).toBe(inviteePhone);
    expect(invitation.status).toBe("pending");
    expect(invitation.sentAt).toBeDefined();
    expect(invitation.respondedAt).toBeNull();
    expect(invitation.createdAt).toBeDefined();
    expect(invitation.updatedAt).toBeDefined();
  });

  it("should enforce unique constraint on trip + phone", async () => {
    const inviteePhone = generateUniquePhone();
    await db.insert(invitations).values({
      tripId,
      inviterId,
      inviteePhone,
    });

    await expect(
      db.insert(invitations).values({
        tripId,
        inviterId,
        inviteePhone,
      }),
    ).rejects.toThrow();
  });

  it("should cascade delete when trip is deleted", async () => {
    const inviteePhone = generateUniquePhone();
    await db.insert(invitations).values({
      tripId,
      inviterId,
      inviteePhone,
    });

    // Delete the trip
    await db.delete(members).where(eq(members.tripId, tripId));
    await db.delete(trips).where(eq(trips.id, tripId));

    const remaining = await db
      .select()
      .from(invitations)
      .where(eq(invitations.tripId, tripId));

    expect(remaining).toHaveLength(0);

    // Reset tripId so cleanup doesn't fail
    tripId = "";
  });

  it("should allow different statuses", async () => {
    const statuses = ["pending", "accepted", "declined", "failed"] as const;
    for (const status of statuses) {
      const inviteePhone = generateUniquePhone();
      const [invitation] = await db
        .insert(invitations)
        .values({
          tripId,
          inviterId,
          inviteePhone,
          status,
        })
        .returning();
      expect(invitation.status).toBe(status);
    }
  });
});
