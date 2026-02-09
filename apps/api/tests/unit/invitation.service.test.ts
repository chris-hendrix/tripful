import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/config/database.js";
import { users, trips, members, invitations, events } from "@/db/schema/index.js";
import { eq, or, and } from "drizzle-orm";
import { InvitationService } from "@/services/invitation.service.js";
import { PermissionsService } from "@/services/permissions.service.js";
import { MockSMSService } from "@/services/sms.service.js";
import { generateUniquePhone } from "../test-utils.js";
import {
  PermissionDeniedError,
  TripNotFoundError,
  MemberLimitExceededError,
  InvitationNotFoundError,
} from "@/errors.js";

// Create service instances with db for testing
const permissionsService = new PermissionsService(db);
const smsService = new MockSMSService();
const invitationService = new InvitationService(
  db,
  permissionsService,
  smsService,
);

describe("invitation.service", () => {
  // Use unique test data for each test run to enable parallel execution
  let testOrganizerPhone: string;
  let testMemberPhone: string;
  let testNonMemberPhone: string;

  let testOrganizerId: string;
  let testMemberId: string;
  let testNonMemberId: string;

  let testTripId: string;

  // Clean up test data (safe for parallel execution)
  const cleanup = async () => {
    // Delete in reverse order of foreign key dependencies
    if (testTripId) {
      await db
        .delete(invitations)
        .where(eq(invitations.tripId, testTripId));
      await db.delete(events).where(eq(events.tripId, testTripId));
      await db.delete(members).where(eq(members.tripId, testTripId));
      await db.delete(trips).where(eq(trips.id, testTripId));
    }

    const phoneNumbers = [
      testOrganizerPhone,
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
    testOrganizerPhone = generateUniquePhone();
    testMemberPhone = generateUniquePhone();
    testNonMemberPhone = generateUniquePhone();

    // Clean up any existing data
    await cleanup();

    // Create test users
    const organizerResult = await db
      .insert(users)
      .values({
        phoneNumber: testOrganizerPhone,
        displayName: "Test Organizer",
        timezone: "UTC",
      })
      .returning();
    testOrganizerId = organizerResult[0].id;

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
        createdBy: testOrganizerId,
      })
      .returning();
    testTripId = tripResult[0].id;

    // Add organizer as member with isOrganizer: true and status: "going"
    await db.insert(members).values({
      tripId: testTripId,
      userId: testOrganizerId,
      status: "going",
      isOrganizer: true,
    });

    // Add regular member with status: "going"
    await db.insert(members).values({
      tripId: testTripId,
      userId: testMemberId,
      status: "going",
    });
  });

  afterEach(cleanup);

  describe("createInvitations", () => {
    it("should create invitations for new phone numbers", async () => {
      const phone1 = generateUniquePhone();
      const phone2 = generateUniquePhone();

      const result = await invitationService.createInvitations(
        testOrganizerId,
        testTripId,
        [phone1, phone2],
      );

      expect(result.invitations).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
      expect(result.invitations[0].tripId).toBe(testTripId);
      expect(result.invitations[0].inviterId).toBe(testOrganizerId);
      expect(result.invitations[0].status).toBe("pending");

      // Verify invitation records exist in DB
      const dbInvitations = await db
        .select()
        .from(invitations)
        .where(eq(invitations.tripId, testTripId));
      expect(dbInvitations).toHaveLength(2);

      // Clean up extra phones
      await db
        .delete(invitations)
        .where(eq(invitations.tripId, testTripId));
      await db
        .delete(users)
        .where(
          or(
            eq(users.phoneNumber, phone1),
            eq(users.phoneNumber, phone2),
          ),
        );
    });

    it("should skip already-invited phone numbers", async () => {
      const phone = generateUniquePhone();

      // First invite
      await invitationService.createInvitations(testOrganizerId, testTripId, [
        phone,
      ]);

      // Second invite of same phone
      const result = await invitationService.createInvitations(
        testOrganizerId,
        testTripId,
        [phone],
      );

      expect(result.invitations).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toBe(phone);
    });

    it("should skip phone numbers that are already members", async () => {
      // Try to invite the organizer's phone (already a member)
      const result = await invitationService.createInvitations(
        testOrganizerId,
        testTripId,
        [testOrganizerPhone],
      );

      expect(result.invitations).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toBe(testOrganizerPhone);
    });

    it("should handle mix of existing users, new users, already-invited", async () => {
      // Create an extra user who is NOT a member
      const extraUserPhone = generateUniquePhone();
      await db.insert(users).values({
        phoneNumber: extraUserPhone,
        displayName: "Extra User",
        timezone: "UTC",
      });

      // A phone with no user account
      const newPhone = generateUniquePhone();

      // A phone we'll pre-invite
      const preInvitedPhone = generateUniquePhone();
      await invitationService.createInvitations(testOrganizerId, testTripId, [
        preInvitedPhone,
      ]);

      // Invite all three
      const result = await invitationService.createInvitations(
        testOrganizerId,
        testTripId,
        [extraUserPhone, newPhone, preInvitedPhone],
      );

      // preInvitedPhone should be skipped (already invited)
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped).toContain(preInvitedPhone);

      // extraUserPhone and newPhone should be created
      expect(result.invitations).toHaveLength(2);

      // extraUserPhone should also have a member record created
      const [extraUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phoneNumber, extraUserPhone));
      const extraMember = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.tripId, testTripId),
            eq(members.userId, extraUser.id),
          ),
        );
      expect(extraMember).toHaveLength(1);
      expect(extraMember[0].status).toBe("no_response");

      // Clean up extra users
      await db
        .delete(users)
        .where(eq(users.phoneNumber, extraUserPhone));
    });

    it("should enforce 25 member limit", async () => {
      // We already have 2 members (organizer + member). Add 22 more to reach 24.
      const extraPhones: string[] = [];
      for (let i = 0; i < 22; i++) {
        const phone = generateUniquePhone();
        extraPhones.push(phone);
        const [user] = await db
          .insert(users)
          .values({
            phoneNumber: phone,
            displayName: `Filler User ${i}`,
            timezone: "UTC",
          })
          .returning();
        await db.insert(members).values({
          tripId: testTripId,
          userId: user.id,
          status: "going",
        });
      }

      // Now we have 24 members. Try to invite 2 more (would be 26)
      const newPhone1 = generateUniquePhone();
      const newPhone2 = generateUniquePhone();

      await expect(
        invitationService.createInvitations(testOrganizerId, testTripId, [
          newPhone1,
          newPhone2,
        ]),
      ).rejects.toThrow(MemberLimitExceededError);

      // Clean up extra users
      await db
        .delete(users)
        .where(
          or(...extraPhones.map((phone) => eq(users.phoneNumber, phone))),
        );
    });

    it("should throw PermissionDeniedError for non-organizers", async () => {
      const phone = generateUniquePhone();

      await expect(
        invitationService.createInvitations(testNonMemberId, testTripId, [
          phone,
        ]),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it("should throw TripNotFoundError for non-existent trip", async () => {
      const phone = generateUniquePhone();

      await expect(
        invitationService.createInvitations(
          testOrganizerId,
          "00000000-0000-0000-0000-000000000000",
          [phone],
        ),
      ).rejects.toThrow(TripNotFoundError);
    });

    it("should create invitation-only for non-existent users (no member record)", async () => {
      // Phone number with no user account
      const newPhone = generateUniquePhone();

      const result = await invitationService.createInvitations(
        testOrganizerId,
        testTripId,
        [newPhone],
      );

      expect(result.invitations).toHaveLength(1);

      // Verify no member record was created for this phone
      // (there's no user with this phone, so no member record should exist)
      const usersWithPhone = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phoneNumber, newPhone));
      expect(usersWithPhone).toHaveLength(0);
    });
  });

  describe("getInvitationsByTrip", () => {
    it("should return invitations for a trip", async () => {
      const phone = generateUniquePhone();
      await invitationService.createInvitations(testOrganizerId, testTripId, [
        phone,
      ]);

      const result = await invitationService.getInvitationsByTrip(testTripId);

      expect(result).toHaveLength(1);
      expect(result[0].tripId).toBe(testTripId);
      expect(result[0].inviteePhone).toBe(phone);
    });

    it("should include invitee names for users that exist", async () => {
      // Create a user, then invite their phone
      const inviteePhone = generateUniquePhone();
      await db.insert(users).values({
        phoneNumber: inviteePhone,
        displayName: "Known Invitee",
        timezone: "UTC",
      });

      await invitationService.createInvitations(testOrganizerId, testTripId, [
        inviteePhone,
      ]);

      const result = await invitationService.getInvitationsByTrip(testTripId);

      expect(result).toHaveLength(1);
      expect(result[0].inviteeName).toBe("Known Invitee");

      // Clean up
      await db
        .delete(users)
        .where(eq(users.phoneNumber, inviteePhone));
    });
  });

  describe("revokeInvitation", () => {
    it("should revoke an invitation and remove member record", async () => {
      // Create a user and invite them
      const inviteePhone = generateUniquePhone();
      const [inviteeUser] = await db
        .insert(users)
        .values({
          phoneNumber: inviteePhone,
          displayName: "Revokee",
          timezone: "UTC",
        })
        .returning();

      const { invitations: created } =
        await invitationService.createInvitations(
          testOrganizerId,
          testTripId,
          [inviteePhone],
        );
      expect(created).toHaveLength(1);

      // Verify member record was created
      const membersBefore = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.tripId, testTripId),
            eq(members.userId, inviteeUser.id),
          ),
        );
      expect(membersBefore).toHaveLength(1);

      // Revoke
      await invitationService.revokeInvitation(
        testOrganizerId,
        created[0].id,
      );

      // Verify invitation deleted
      const remainingInvitations = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, created[0].id));
      expect(remainingInvitations).toHaveLength(0);

      // Verify member record deleted
      const membersAfter = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.tripId, testTripId),
            eq(members.userId, inviteeUser.id),
          ),
        );
      expect(membersAfter).toHaveLength(0);

      // Clean up
      await db
        .delete(users)
        .where(eq(users.phoneNumber, inviteePhone));
    });

    it("should throw InvitationNotFoundError for non-existent invitation", async () => {
      await expect(
        invitationService.revokeInvitation(
          testOrganizerId,
          "00000000-0000-0000-0000-000000000000",
        ),
      ).rejects.toThrow(InvitationNotFoundError);
    });

    it("should throw PermissionDeniedError for non-organizers", async () => {
      const phone = generateUniquePhone();
      const { invitations: created } =
        await invitationService.createInvitations(
          testOrganizerId,
          testTripId,
          [phone],
        );

      await expect(
        invitationService.revokeInvitation(testMemberId, created[0].id),
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  describe("updateRsvp", () => {
    it("should update RSVP status to going", async () => {
      const result = await invitationService.updateRsvp(
        testMemberId,
        testTripId,
        "going",
      );

      expect(result.status).toBe("going");
      expect(result.userId).toBe(testMemberId);
    });

    it("should update RSVP status to maybe", async () => {
      const result = await invitationService.updateRsvp(
        testMemberId,
        testTripId,
        "maybe",
      );

      expect(result.status).toBe("maybe");
    });

    it("should update RSVP status to not_going", async () => {
      const result = await invitationService.updateRsvp(
        testMemberId,
        testTripId,
        "not_going",
      );

      expect(result.status).toBe("not_going");
    });

    it("should return MemberWithProfile with correct fields", async () => {
      const result = await invitationService.updateRsvp(
        testMemberId,
        testTripId,
        "going",
      );

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("userId");
      expect(result).toHaveProperty("displayName");
      expect(result).toHaveProperty("profilePhotoUrl");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("isOrganizer");
      expect(result).toHaveProperty("createdAt");
      expect(result.displayName).toBe("Test Member");
      expect(result.isOrganizer).toBe(false);
      expect(typeof result.createdAt).toBe("string");
    });

    it("should throw PermissionDeniedError for non-members", async () => {
      await expect(
        invitationService.updateRsvp(testNonMemberId, testTripId, "going"),
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  describe("getTripMembers", () => {
    it("should return members with profiles", async () => {
      const result = await invitationService.getTripMembers(
        testTripId,
        testOrganizerId,
      );

      expect(result).toHaveLength(2);

      const organizer = result.find((m) => m.userId === testOrganizerId);
      expect(organizer).toBeDefined();
      expect(organizer!.displayName).toBe("Test Organizer");
      expect(organizer!.isOrganizer).toBe(true);
      expect(typeof organizer!.createdAt).toBe("string");

      const member = result.find((m) => m.userId === testMemberId);
      expect(member).toBeDefined();
      expect(member!.displayName).toBe("Test Member");
      expect(member!.isOrganizer).toBe(false);
    });

    it("should include phone numbers for organizers", async () => {
      const result = await invitationService.getTripMembers(
        testTripId,
        testOrganizerId,
      );

      // Organizer should see phone numbers
      for (const m of result) {
        expect(m.phoneNumber).toBeDefined();
        expect(typeof m.phoneNumber).toBe("string");
      }
    });

    it("should NOT include phone numbers for non-organizers", async () => {
      const result = await invitationService.getTripMembers(
        testTripId,
        testMemberId,
      );

      // Regular member should NOT see phone numbers
      for (const m of result) {
        expect(m.phoneNumber).toBeUndefined();
      }
    });

    it("should throw PermissionDeniedError for non-members", async () => {
      await expect(
        invitationService.getTripMembers(testTripId, testNonMemberId),
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  describe("processPendingInvitations", () => {
    it("should create member records for pending invitations", async () => {
      // Create an invitation for a phone that has no user yet
      const newUserPhone = generateUniquePhone();
      await invitationService.createInvitations(testOrganizerId, testTripId, [
        newUserPhone,
      ]);

      // Now create a user with that phone
      const [newUser] = await db
        .insert(users)
        .values({
          phoneNumber: newUserPhone,
          displayName: "New User",
          timezone: "UTC",
        })
        .returning();

      // Process pending invitations
      await invitationService.processPendingInvitations(
        newUser.id,
        newUserPhone,
      );

      // Verify member record was created
      const memberRecords = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.tripId, testTripId),
            eq(members.userId, newUser.id),
          ),
        );
      expect(memberRecords).toHaveLength(1);
      expect(memberRecords[0].status).toBe("no_response");
      expect(memberRecords[0].isOrganizer).toBe(false);

      // Clean up
      await db
        .delete(users)
        .where(eq(users.phoneNumber, newUserPhone));
    });

    it("should update invitation status to accepted", async () => {
      const newUserPhone = generateUniquePhone();
      await invitationService.createInvitations(testOrganizerId, testTripId, [
        newUserPhone,
      ]);

      const [newUser] = await db
        .insert(users)
        .values({
          phoneNumber: newUserPhone,
          displayName: "New User",
          timezone: "UTC",
        })
        .returning();

      await invitationService.processPendingInvitations(
        newUser.id,
        newUserPhone,
      );

      // Verify invitation status updated
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.tripId, testTripId),
            eq(invitations.inviteePhone, newUserPhone),
          ),
        );
      expect(invitation.status).toBe("accepted");
      expect(invitation.respondedAt).not.toBeNull();

      // Clean up
      await db
        .delete(users)
        .where(eq(users.phoneNumber, newUserPhone));
    });

    it("should not create duplicate member records", async () => {
      // Invite an existing user's phone (this creates both invitation and member)
      const existingUserPhone = generateUniquePhone();
      const [existingUser] = await db
        .insert(users)
        .values({
          phoneNumber: existingUserPhone,
          displayName: "Existing User",
          timezone: "UTC",
        })
        .returning();

      await invitationService.createInvitations(testOrganizerId, testTripId, [
        existingUserPhone,
      ]);

      // Member record already exists from createInvitations
      // Process again - should not create duplicate
      await invitationService.processPendingInvitations(
        existingUser.id,
        existingUserPhone,
      );

      const memberRecords = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.tripId, testTripId),
            eq(members.userId, existingUser.id),
          ),
        );
      expect(memberRecords).toHaveLength(1);

      // Clean up
      await db
        .delete(users)
        .where(eq(users.phoneNumber, existingUserPhone));
    });

    it("should handle no pending invitations gracefully", async () => {
      // Process invitations for a phone with no pending invitations
      const randomPhone = generateUniquePhone();

      // Should not throw
      await invitationService.processPendingInvitations(
        testMemberId,
        randomPhone,
      );
    });
  });
});
