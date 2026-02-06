import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/config/database.js";
import { users, trips, members } from "@/db/schema/index.js";
import { eq, or } from "drizzle-orm";
import { permissionsService } from "@/services/permissions.service.js";
import { generateUniquePhone } from "../test-utils.js";

describe("permissions.service", () => {
  // Use unique test data for each test run to enable parallel execution
  let testCreatorPhone: string;
  let testCoOrganizerPhone: string;
  let testMemberPhone: string;
  let testNonMemberPhone: string;

  let testCreatorId: string;
  let testCoOrganizerId: string;
  let testMemberId: string;
  let testNonMemberId: string;

  let testTripId: string;

  // Clean up test data (safe for parallel execution)
  const cleanup = async () => {
    // Delete in reverse order of foreign key dependencies
    if (testTripId) {
      await db.delete(members).where(eq(members.tripId, testTripId));
      await db.delete(trips).where(eq(trips.id, testTripId));
    }

    const phoneNumbers = [
      testCreatorPhone,
      testCoOrganizerPhone,
      testMemberPhone,
      testNonMemberPhone,
    ].filter(Boolean);

    if (phoneNumbers.length > 0) {
      await db
        .delete(users)
        .where(
          or(...phoneNumbers.map((phone) => eq(users.phoneNumber, phone))),
        );
    }
  };

  beforeEach(async () => {
    // Generate unique phone numbers for this test run
    testCreatorPhone = generateUniquePhone();
    testCoOrganizerPhone = generateUniquePhone();
    testMemberPhone = generateUniquePhone();
    testNonMemberPhone = generateUniquePhone();

    // Clean up any existing data
    await cleanup();

    // Create test users
    const creatorResult = await db
      .insert(users)
      .values({
        phoneNumber: testCreatorPhone,
        displayName: "Test Creator",
        timezone: "UTC",
      })
      .returning();
    testCreatorId = creatorResult[0].id;

    const coOrganizerResult = await db
      .insert(users)
      .values({
        phoneNumber: testCoOrganizerPhone,
        displayName: "Test Co-Organizer",
        timezone: "UTC",
      })
      .returning();
    testCoOrganizerId = coOrganizerResult[0].id;

    const memberResult = await db
      .insert(users)
      .values({
        phoneNumber: testMemberPhone,
        displayName: "Test Member",
        timezone: "UTC",
      })
      .returning();
    testMemberId = memberResult[0].id;

    const nonMemberResult = await db
      .insert(users)
      .values({
        phoneNumber: testNonMemberPhone,
        displayName: "Test Non-Member",
        timezone: "UTC",
      })
      .returning();
    testNonMemberId = nonMemberResult[0].id;

    // Create a test trip
    const tripResult = await db
      .insert(trips)
      .values({
        name: "Test Trip",
        destination: "Test Destination",
        preferredTimezone: "UTC",
        createdBy: testCreatorId,
      })
      .returning();
    testTripId = tripResult[0].id;

    // Add co-organizer as member with status='going'
    await db.insert(members).values({
      tripId: testTripId,
      userId: testCoOrganizerId,
      status: "going",
    });

    // Add regular member with status='maybe'
    await db.insert(members).values({
      tripId: testTripId,
      userId: testMemberId,
      status: "maybe",
    });
  });

  afterEach(cleanup);

  describe("isOrganizer", () => {
    it("should return true for trip creator", async () => {
      const result = await permissionsService.isOrganizer(
        testCreatorId,
        testTripId,
      );
      expect(result).toBe(true);
    });

    it("should return true for co-organizer (member with status=going)", async () => {
      const result = await permissionsService.isOrganizer(
        testCoOrganizerId,
        testTripId,
      );
      expect(result).toBe(true);
    });

    it("should return false for regular member (status!=going)", async () => {
      const result = await permissionsService.isOrganizer(
        testMemberId,
        testTripId,
      );
      expect(result).toBe(false);
    });

    it("should return false for non-member", async () => {
      const result = await permissionsService.isOrganizer(
        testNonMemberId,
        testTripId,
      );
      expect(result).toBe(false);
    });

    it("should return false for non-existent trip", async () => {
      const result = await permissionsService.isOrganizer(
        testCreatorId,
        "00000000-0000-0000-0000-000000000000",
      );
      expect(result).toBe(false);
    });

    it("should return false for non-existent user", async () => {
      const result = await permissionsService.isOrganizer(
        "00000000-0000-0000-0000-000000000000",
        testTripId,
      );
      expect(result).toBe(false);
    });
  });

  describe("isMember", () => {
    it("should return true for co-organizer (who is also a member)", async () => {
      const result = await permissionsService.isMember(
        testCoOrganizerId,
        testTripId,
      );
      expect(result).toBe(true);
    });

    it("should return true for regular member", async () => {
      const result = await permissionsService.isMember(
        testMemberId,
        testTripId,
      );
      expect(result).toBe(true);
    });

    it("should return false for non-member", async () => {
      const result = await permissionsService.isMember(
        testNonMemberId,
        testTripId,
      );
      expect(result).toBe(false);
    });

    it("should return false for trip creator if they are not also a member", async () => {
      // Creator is NOT automatically a member (they just created the trip)
      const result = await permissionsService.isMember(
        testCreatorId,
        testTripId,
      );
      expect(result).toBe(false);
    });

    it("should return false for non-existent trip", async () => {
      const result = await permissionsService.isMember(
        testMemberId,
        "00000000-0000-0000-0000-000000000000",
      );
      expect(result).toBe(false);
    });

    it("should return false for non-existent user", async () => {
      const result = await permissionsService.isMember(
        "00000000-0000-0000-0000-000000000000",
        testTripId,
      );
      expect(result).toBe(false);
    });
  });

  describe("canEditTrip", () => {
    it("should return true for trip creator", async () => {
      const result = await permissionsService.canEditTrip(
        testCreatorId,
        testTripId,
      );
      expect(result).toBe(true);
    });

    it("should return true for co-organizer", async () => {
      const result = await permissionsService.canEditTrip(
        testCoOrganizerId,
        testTripId,
      );
      expect(result).toBe(true);
    });

    it("should return false for regular member", async () => {
      const result = await permissionsService.canEditTrip(
        testMemberId,
        testTripId,
      );
      expect(result).toBe(false);
    });

    it("should return false for non-member", async () => {
      const result = await permissionsService.canEditTrip(
        testNonMemberId,
        testTripId,
      );
      expect(result).toBe(false);
    });
  });

  describe("canDeleteTrip", () => {
    it("should return true for trip creator", async () => {
      const result = await permissionsService.canDeleteTrip(
        testCreatorId,
        testTripId,
      );
      expect(result).toBe(true);
    });

    it("should return true for co-organizer", async () => {
      const result = await permissionsService.canDeleteTrip(
        testCoOrganizerId,
        testTripId,
      );
      expect(result).toBe(true);
    });

    it("should return false for regular member", async () => {
      const result = await permissionsService.canDeleteTrip(
        testMemberId,
        testTripId,
      );
      expect(result).toBe(false);
    });

    it("should return false for non-member", async () => {
      const result = await permissionsService.canDeleteTrip(
        testNonMemberId,
        testTripId,
      );
      expect(result).toBe(false);
    });
  });

  describe("canManageCoOrganizers", () => {
    it("should return true for trip creator", async () => {
      const result = await permissionsService.canManageCoOrganizers(
        testCreatorId,
        testTripId,
      );
      expect(result).toBe(true);
    });

    it("should return true for co-organizer", async () => {
      const result = await permissionsService.canManageCoOrganizers(
        testCoOrganizerId,
        testTripId,
      );
      expect(result).toBe(true);
    });

    it("should return false for regular member", async () => {
      const result = await permissionsService.canManageCoOrganizers(
        testMemberId,
        testTripId,
      );
      expect(result).toBe(false);
    });

    it("should return false for non-member", async () => {
      const result = await permissionsService.canManageCoOrganizers(
        testNonMemberId,
        testTripId,
      );
      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle member status changes correctly", async () => {
      // Regular member becomes co-organizer
      await db
        .update(members)
        .set({ status: "going" })
        .where(eq(members.userId, testMemberId));

      let result = await permissionsService.isOrganizer(
        testMemberId,
        testTripId,
      );
      expect(result).toBe(true);

      // Co-organizer steps down
      await db
        .update(members)
        .set({ status: "not_going" })
        .where(eq(members.userId, testMemberId));

      result = await permissionsService.isOrganizer(testMemberId, testTripId);
      expect(result).toBe(false);
    });

    it("should handle creator also being a member", async () => {
      // Add creator as a member
      await db.insert(members).values({
        tripId: testTripId,
        userId: testCreatorId,
        status: "going",
      });

      // Should still be an organizer (via creator status)
      const isOrganizerResult = await permissionsService.isOrganizer(
        testCreatorId,
        testTripId,
      );
      expect(isOrganizerResult).toBe(true);

      // Should also be a member now
      const isMemberResult = await permissionsService.isMember(
        testCreatorId,
        testTripId,
      );
      expect(isMemberResult).toBe(true);
    });

    it("should handle multiple co-organizers", async () => {
      // Create another user and make them a co-organizer
      const anotherPhone = generateUniquePhone();
      const anotherUserResult = await db
        .insert(users)
        .values({
          phoneNumber: anotherPhone,
          displayName: "Another Co-Organizer",
          timezone: "UTC",
        })
        .returning();
      const anotherUserId = anotherUserResult[0].id;

      await db.insert(members).values({
        tripId: testTripId,
        userId: anotherUserId,
        status: "going",
      });

      const result = await permissionsService.isOrganizer(
        anotherUserId,
        testTripId,
      );
      expect(result).toBe(true);

      // Clean up
      await db.delete(members).where(eq(members.userId, anotherUserId));
      await db.delete(users).where(eq(users.id, anotherUserId));
    });
  });
});
