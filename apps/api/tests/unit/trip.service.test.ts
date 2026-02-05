import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/config/database.js';
import { trips, members, users } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { tripService } from '@/services/trip.service.js';
import { generateUniquePhone } from '../test-utils.js';
import type { CreateTripInput } from '../../../../shared/schemas/index.js';

describe('trip.service', () => {
  // Use unique phone numbers per test run to enable parallel execution
  let testUserId: string;
  let testPhone: string;
  let coOrganizerUserId: string;
  let coOrganizerPhone: string;
  let coOrganizer2UserId: string;
  let coOrganizer2Phone: string;

  // Clean up only this test file's data (safe for parallel execution)
  const cleanup = async () => {
    // Delete in reverse order of FK dependencies
    if (testUserId) {
      await db.delete(members).where(eq(members.userId, testUserId));
      await db.delete(trips).where(eq(trips.createdBy, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    if (coOrganizerUserId) {
      await db.delete(members).where(eq(members.userId, coOrganizerUserId));
      await db.delete(users).where(eq(users.id, coOrganizerUserId));
    }
    if (coOrganizer2UserId) {
      await db.delete(members).where(eq(members.userId, coOrganizer2UserId));
      await db.delete(users).where(eq(users.id, coOrganizer2UserId));
    }
  };

  beforeEach(async () => {
    testPhone = generateUniquePhone();
    coOrganizerPhone = generateUniquePhone();
    coOrganizer2Phone = generateUniquePhone();
    await cleanup();

    // Setup test user (creator)
    const [testUser] = await db
      .insert(users)
      .values({
        phoneNumber: testPhone,
        displayName: 'Test User',
        timezone: 'UTC',
      })
      .returning();
    testUserId = testUser.id;

    // Setup co-organizer user
    const [coOrganizerUser] = await db
      .insert(users)
      .values({
        phoneNumber: coOrganizerPhone,
        displayName: 'Co-Organizer',
        timezone: 'UTC',
      })
      .returning();
    coOrganizerUserId = coOrganizerUser.id;

    // Setup second co-organizer user
    const [coOrganizer2User] = await db
      .insert(users)
      .values({
        phoneNumber: coOrganizer2Phone,
        displayName: 'Co-Organizer 2',
        timezone: 'UTC',
      })
      .returning();
    coOrganizer2UserId = coOrganizer2User.id;
  });

  afterEach(cleanup);

  describe('createTrip', () => {
    it('should create trip record with correct data', async () => {
      const tripData: CreateTripInput = {
        name: 'Beach Vacation',
        destination: 'Hawaii',
        startDate: '2026-06-01',
        endDate: '2026-06-10',
        timezone: 'Pacific/Honolulu',
        description: 'Summer beach trip',
        coverImageUrl: 'https://example.com/beach.jpg',
        allowMembersToAddEvents: true,
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Verify trip was created with correct data
      expect(trip).toBeDefined();
      expect(trip.id).toBeDefined();
      expect(trip.name).toBe('Beach Vacation');
      expect(trip.destination).toBe('Hawaii');
      expect(trip.startDate).toBe('2026-06-01');
      expect(trip.endDate).toBe('2026-06-10');
      expect(trip.preferredTimezone).toBe('Pacific/Honolulu'); // Note: timezone -> preferredTimezone
      expect(trip.description).toBe('Summer beach trip');
      expect(trip.coverImageUrl).toBe('https://example.com/beach.jpg');
      expect(trip.allowMembersToAddEvents).toBe(true);
      expect(trip.cancelled).toBe(false);
      expect(trip.createdBy).toBe(testUserId);
      expect(trip.createdAt).toBeInstanceOf(Date);
      expect(trip.updatedAt).toBeInstanceOf(Date);

      // Verify trip exists in database
      const dbTrip = await db
        .select()
        .from(trips)
        .where(eq(trips.id, trip.id))
        .limit(1);
      expect(dbTrip).toHaveLength(1);
      expect(dbTrip[0].name).toBe('Beach Vacation');
    });

    it('should automatically add creator as member with status="going"', async () => {
      const tripData: CreateTripInput = {
        name: 'City Tour',
        destination: 'New York',
        timezone: 'America/New_York',
        allowMembersToAddEvents: true,
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Verify creator is added as member with status='going'
      const memberRecords = await db
        .select()
        .from(members)
        .where(eq(members.tripId, trip.id));

      expect(memberRecords).toHaveLength(1);
      expect(memberRecords[0].userId).toBe(testUserId);
      expect(memberRecords[0].status).toBe('going');
      expect(memberRecords[0].tripId).toBe(trip.id);
      expect(memberRecords[0].createdAt).toBeInstanceOf(Date);
      expect(memberRecords[0].updatedAt).toBeInstanceOf(Date);
    });

    it('should add co-organizers as members when provided', async () => {
      const tripData: CreateTripInput = {
        name: 'Group Adventure',
        destination: 'Mountains',
        timezone: 'America/Denver',
        allowMembersToAddEvents: true,
        coOrganizerPhones: [coOrganizerPhone, coOrganizer2Phone],
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Verify all members are added: creator + 2 co-organizers
      const memberRecords = await db
        .select()
        .from(members)
        .where(eq(members.tripId, trip.id));

      expect(memberRecords).toHaveLength(3);

      // Verify creator is a member
      const creatorMember = memberRecords.find((m) => m.userId === testUserId);
      expect(creatorMember).toBeDefined();
      expect(creatorMember!.status).toBe('going');

      // Verify co-organizer 1 is a member
      const coOrganizerMember = memberRecords.find((m) => m.userId === coOrganizerUserId);
      expect(coOrganizerMember).toBeDefined();
      expect(coOrganizerMember!.status).toBe('going');

      // Verify co-organizer 2 is a member
      const coOrganizer2Member = memberRecords.find((m) => m.userId === coOrganizer2UserId);
      expect(coOrganizer2Member).toBeDefined();
      expect(coOrganizer2Member!.status).toBe('going');
    });

    it('should return trip object with all fields populated', async () => {
      const tripData: CreateTripInput = {
        name: 'Weekend Getaway',
        destination: 'Lake Tahoe',
        startDate: '2026-07-15',
        endDate: '2026-07-17',
        timezone: 'America/Los_Angeles',
        description: 'Quick weekend trip',
        coverImageUrl: null, // Test null value
        allowMembersToAddEvents: false,
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Verify all fields are present
      expect(trip).toMatchObject({
        name: 'Weekend Getaway',
        destination: 'Lake Tahoe',
        startDate: '2026-07-15',
        endDate: '2026-07-17',
        preferredTimezone: 'America/Los_Angeles',
        description: 'Quick weekend trip',
        coverImageUrl: null,
        allowMembersToAddEvents: false,
        cancelled: false,
        createdBy: testUserId,
      });

      // Verify UUID and timestamps are present
      expect(trip.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(trip.createdAt).toBeInstanceOf(Date);
      expect(trip.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when co-organizer phone not found', async () => {
      const nonExistentPhone = generateUniquePhone();
      const tripData: CreateTripInput = {
        name: 'Failed Trip',
        destination: 'Nowhere',
        timezone: 'UTC',
        allowMembersToAddEvents: true,
        coOrganizerPhones: [nonExistentPhone],
      };

      await expect(tripService.createTrip(testUserId, tripData)).rejects.toThrow(
        `Co-organizer not found: ${nonExistentPhone}`
      );

      // Verify no trip was created
      const allTrips = await db.select().from(trips).where(eq(trips.createdBy, testUserId));
      expect(allTrips).toHaveLength(0);
    });

    it('should throw error when member limit exceeded (>25)', async () => {
      // Create 25 co-organizers (creator + 25 = 26, which exceeds limit)
      const coOrganizerPhones: string[] = [];
      for (let i = 0; i < 25; i++) {
        const phone = generateUniquePhone();
        await db.insert(users).values({
          phoneNumber: phone,
          displayName: `Co-Organizer ${i}`,
          timezone: 'UTC',
        });
        coOrganizerPhones.push(phone);
      }

      const tripData: CreateTripInput = {
        name: 'Too Many Members',
        destination: 'Somewhere',
        timezone: 'UTC',
        allowMembersToAddEvents: true,
        coOrganizerPhones,
      };

      await expect(tripService.createTrip(testUserId, tripData)).rejects.toThrow(
        'Member limit exceeded: maximum 25 members allowed (including creator)'
      );

      // Verify no trip was created
      const allTrips = await db.select().from(trips).where(eq(trips.createdBy, testUserId));
      expect(allTrips).toHaveLength(0);

      // Cleanup the 25 test users
      for (const phone of coOrganizerPhones) {
        await db.delete(users).where(eq(users.phoneNumber, phone));
      }
    });

    it('should handle optional fields correctly', async () => {
      const tripData: CreateTripInput = {
        name: 'Minimal Trip',
        destination: 'Somewhere',
        timezone: 'UTC',
        allowMembersToAddEvents: true,
        // No startDate, endDate, description, coverImageUrl
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      expect(trip.name).toBe('Minimal Trip');
      expect(trip.destination).toBe('Somewhere');
      expect(trip.startDate).toBeNull();
      expect(trip.endDate).toBeNull();
      expect(trip.description).toBeNull();
      expect(trip.coverImageUrl).toBeNull();
      expect(trip.preferredTimezone).toBe('UTC');
      expect(trip.allowMembersToAddEvents).toBe(true);
    });
  });

  describe('getMemberCount', () => {
    it('should return 0 for trip with no members', async () => {
      // Create a trip (which adds creator as member)
      const tripData: CreateTripInput = {
        name: 'Test Trip',
        destination: 'Test Destination',
        timezone: 'UTC',
        allowMembersToAddEvents: true,
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Delete all members from the trip
      await db.delete(members).where(eq(members.tripId, trip.id));

      // Verify count is 0
      const count = await tripService.getMemberCount(trip.id);
      expect(count).toBe(0);
    });

    it('should return 1 for trip with only creator', async () => {
      const tripData: CreateTripInput = {
        name: 'Solo Trip',
        destination: 'Solo Destination',
        timezone: 'UTC',
        allowMembersToAddEvents: true,
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Verify count is 1 (creator only)
      const count = await tripService.getMemberCount(trip.id);
      expect(count).toBe(1);
    });

    it('should return correct count for trip with creator and co-organizers', async () => {
      const tripData: CreateTripInput = {
        name: 'Group Trip',
        destination: 'Group Destination',
        timezone: 'UTC',
        allowMembersToAddEvents: true,
        coOrganizerPhones: [coOrganizerPhone, coOrganizer2Phone],
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Verify count is 3 (creator + 2 co-organizers)
      const count = await tripService.getMemberCount(trip.id);
      expect(count).toBe(3);
    });

    it('should count all members regardless of status', async () => {
      const tripData: CreateTripInput = {
        name: 'Status Test Trip',
        destination: 'Status Test',
        timezone: 'UTC',
        allowMembersToAddEvents: true,
        coOrganizerPhones: [coOrganizerPhone],
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Update co-organizer status to 'maybe'
      await db
        .update(members)
        .set({ status: 'maybe' })
        .where(eq(members.userId, coOrganizerUserId));

      // Verify count is still 2 (status doesn't matter)
      const count = await tripService.getMemberCount(trip.id);
      expect(count).toBe(2);
    });
  });

  describe('getTripById', () => {
    it('should return full trip details when user is a member', async () => {
      // Create a trip with co-organizers
      const tripData: CreateTripInput = {
        name: 'Tokyo Adventure',
        destination: 'Tokyo, Japan',
        startDate: '2026-09-01',
        endDate: '2026-09-10',
        timezone: 'Asia/Tokyo',
        description: 'Exploring Tokyo together',
        coverImageUrl: 'https://example.com/tokyo.jpg',
        allowMembersToAddEvents: true,
        coOrganizerPhones: [coOrganizerPhone],
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Get trip as the creator (who is a member)
      const result = await tripService.getTripById(trip.id, testUserId);

      // Verify trip is returned with all details
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result!.id).toBe(trip.id);
      expect(result!.name).toBe('Tokyo Adventure');
      expect(result!.destination).toBe('Tokyo, Japan');
      expect(result!.startDate).toBe('2026-09-01');
      expect(result!.endDate).toBe('2026-09-10');
      expect(result!.preferredTimezone).toBe('Asia/Tokyo');
      expect(result!.description).toBe('Exploring Tokyo together');
      expect(result!.coverImageUrl).toBe('https://example.com/tokyo.jpg');
      expect(result!.allowMembersToAddEvents).toBe(true);
      expect(result!.cancelled).toBe(false);
      expect(result!.createdBy).toBe(testUserId);
    });

    it('should return null when trip does not exist', async () => {
      const nonExistentTripId = '00000000-0000-0000-0000-000000000000';

      const result = await tripService.getTripById(nonExistentTripId, testUserId);

      expect(result).toBeNull();
    });

    it('should return null when user is not a member', async () => {
      // Create a trip with testUser as creator
      const tripData: CreateTripInput = {
        name: 'Private Trip',
        destination: 'Secret Location',
        timezone: 'UTC',
        allowMembersToAddEvents: true,
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Try to access as coOrganizer (who is not a member)
      const result = await tripService.getTripById(trip.id, coOrganizerUserId);

      // Should return null for non-members (security best practice)
      expect(result).toBeNull();
    });

    it('should include organizer information', async () => {
      // Create a trip with co-organizers
      const tripData: CreateTripInput = {
        name: 'Team Trip',
        destination: 'Conference Center',
        timezone: 'America/New_York',
        allowMembersToAddEvents: true,
        coOrganizerPhones: [coOrganizerPhone, coOrganizer2Phone],
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Get trip as a member
      const result = await tripService.getTripById(trip.id, testUserId);

      // Verify organizer information is included
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('organizers');
      expect(Array.isArray(result!.organizers)).toBe(true);
      expect(result!.organizers).toHaveLength(3); // creator + 2 co-organizers

      // Verify creator is in organizers list
      const creator = result!.organizers.find((org: any) => org.id === testUserId);
      expect(creator).toBeDefined();
      expect(creator.displayName).toBe('Test User');
      expect(creator.phoneNumber).toBe(testPhone);

      // Verify co-organizers are in the list
      const coOrg1 = result!.organizers.find((org: any) => org.id === coOrganizerUserId);
      expect(coOrg1).toBeDefined();
      expect(coOrg1.displayName).toBe('Co-Organizer');

      const coOrg2 = result!.organizers.find((org: any) => org.id === coOrganizer2UserId);
      expect(coOrg2).toBeDefined();
      expect(coOrg2.displayName).toBe('Co-Organizer 2');
    });

    it('should include member count', async () => {
      // Create a trip with co-organizers
      const tripData: CreateTripInput = {
        name: 'Group Vacation',
        destination: 'Beach Resort',
        timezone: 'Pacific/Honolulu',
        allowMembersToAddEvents: true,
        coOrganizerPhones: [coOrganizerPhone, coOrganizer2Phone],
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Get trip as a member
      const result = await tripService.getTripById(trip.id, testUserId);

      // Verify member count is included
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('memberCount');
      expect(result!.memberCount).toBe(3); // creator + 2 co-organizers
    });

    it('should allow co-organizer to access trip', async () => {
      // Create a trip with co-organizer
      const tripData: CreateTripInput = {
        name: 'Shared Trip',
        destination: 'Shared Destination',
        timezone: 'UTC',
        allowMembersToAddEvents: true,
        coOrganizerPhones: [coOrganizerPhone],
      };

      const trip = await tripService.createTrip(testUserId, tripData);

      // Get trip as the co-organizer (who is a member)
      const result = await tripService.getTripById(trip.id, coOrganizerUserId);

      // Verify co-organizer can access the trip
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result!.id).toBe(trip.id);
      expect(result!.name).toBe('Shared Trip');
    });
  });
});
