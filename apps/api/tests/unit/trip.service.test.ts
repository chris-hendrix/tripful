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
});
