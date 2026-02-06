import { db } from '@/config/database.js';
import { trips, members, users, type Trip, type Member } from '@/db/schema/index.js';
import { eq, inArray, and, asc, sql } from 'drizzle-orm';
import type { CreateTripInput, UpdateTripInput } from '@tripful/shared/schemas';
import { permissionsService } from './permissions.service.js';

/**
 * Trip Summary Type
 * Used for dashboard display of trips
 */
export type TripSummary = {
  id: string;
  name: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  coverImageUrl: string | null;
  isOrganizer: boolean;
  rsvpStatus: 'going' | 'not_going' | 'maybe' | 'no_response';
  organizerInfo: Array<{
    id: string;
    displayName: string;
    profilePhotoUrl: string | null;
  }>;
  memberCount: number;
  eventCount: number;
};

/**
 * Trip Service Interface
 * Defines the contract for trip management operations
 */
export interface ITripService {
  /**
   * Creates a new trip with the creator as the first member
   * @param userId - The ID of the user creating the trip
   * @param data - The trip creation data
   * @returns Promise that resolves to the created trip
   * @throws Error if co-organizer not found or member limit exceeded
   */
  createTrip(userId: string, data: CreateTripInput): Promise<Trip>;

  /**
   * Gets a trip by ID with organizer and member information
   * @param tripId - The UUID of the trip to retrieve
   * @param userId - The UUID of the user requesting the trip
   * @returns Promise that resolves to the trip with organizers and memberCount, or null if not found or not authorized
   */
  getTripById(
    tripId: string,
    userId: string
  ): Promise<(Trip & { organizers: Array<{ id: string; displayName: string; phoneNumber: string; profilePhotoUrl: string | null; timezone: string }>; memberCount: number }) | null>;

  /**
   * Gets all trips for a user with summary information
   * @param userId - The UUID of the user
   * @returns Promise that resolves to array of trip summaries
   */
  getUserTrips(userId: string): Promise<TripSummary[]>;

  /**
   * Updates a trip (to be implemented)
   * @param tripId - The UUID of the trip to update
   * @param userId - The UUID of the user requesting the update
   * @param data - The trip update data
   * @returns Promise that resolves to the updated trip
   */
  updateTrip(tripId: string, userId: string, data: UpdateTripInput): Promise<Trip>;

  /**
   * Cancels a trip (to be implemented)
   * @param tripId - The UUID of the trip to cancel
   * @returns Promise that resolves when the trip is cancelled
   */
  cancelTrip(tripId: string): Promise<void>;

  /**
   * Adds co-organizers to a trip (to be implemented)
   * @param tripId - The UUID of the trip
   * @param phoneNumbers - Array of phone numbers to add as co-organizers
   * @returns Promise that resolves when co-organizers are added
   */
  addCoOrganizers(tripId: string, phoneNumbers: string[]): Promise<void>;

  /**
   * Removes a co-organizer from a trip (to be implemented)
   * @param tripId - The UUID of the trip
   * @param userId - The UUID of the user to remove
   * @returns Promise that resolves when the co-organizer is removed
   */
  removeCoOrganizer(tripId: string, userId: string): Promise<void>;

  /**
   * Gets all co-organizers for a trip (to be implemented)
   * @param tripId - The UUID of the trip
   * @returns Promise that resolves to array of user IDs
   */
  getCoOrganizers(tripId: string): Promise<string[]>;

  /**
   * Gets all members of a trip (to be implemented)
   * @param tripId - The UUID of the trip
   * @returns Promise that resolves to array of members
   */
  getTripMembers(tripId: string): Promise<Member[]>;

  /**
   * Gets the count of members for a trip (to be implemented)
   * @param tripId - The UUID of the trip
   * @returns Promise that resolves to the member count
   */
  getMemberCount(tripId: string): Promise<number>;
}

/**
 * Trip Service Implementation
 * Handles trip creation, management, and member operations
 */
export class TripService implements ITripService {
  /**
   * Creates a new trip with the creator as the first member
   * Validates co-organizers and checks member limits before creating
   * @param userId - The ID of the user creating the trip
   * @param data - The trip creation data
   * @returns The created trip
   * @throws Error if co-organizer not found or member limit exceeded
   */
  async createTrip(userId: string, data: CreateTripInput): Promise<Trip> {
    // Validate co-organizers and check member limit
    let coOrganizerUserIds: string[] = [];

    if (data.coOrganizerPhones && data.coOrganizerPhones.length > 0) {
      // Check member limit: creator (1) + co-organizers must be <= 25
      if (1 + data.coOrganizerPhones.length > 25) {
        throw new Error('Member limit exceeded: maximum 25 members allowed (including creator)');
      }

      // Lookup users by phone number
      const coOrganizerUsers = await db
        .select()
        .from(users)
        .where(inArray(users.phoneNumber, data.coOrganizerPhones));

      // Verify all phone numbers were found
      if (coOrganizerUsers.length !== data.coOrganizerPhones.length) {
        const foundPhones = coOrganizerUsers.map((u) => u.phoneNumber);
        const missingPhones = data.coOrganizerPhones.filter(
          (phone: string) => !foundPhones.includes(phone)
        );
        throw new Error(`Co-organizer not found: ${missingPhones[0]}`);
      }

      coOrganizerUserIds = coOrganizerUsers.map((u) => u.id);
    }

    // Insert trip record
    const [trip] = await db
      .insert(trips)
      .values({
        name: data.name,
        destination: data.destination,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        preferredTimezone: data.timezone, // Map timezone -> preferredTimezone
        description: data.description || null,
        coverImageUrl: data.coverImageUrl === null ? null : data.coverImageUrl || null,
        createdBy: userId,
        allowMembersToAddEvents: data.allowMembersToAddEvents,
      })
      .returning();

    if (!trip) {
      throw new Error('Failed to create trip');
    }

    // Insert creator as member with status='going'
    await db.insert(members).values({
      tripId: trip.id,
      userId: userId,
      status: 'going',
    });

    // Insert co-organizers as members with status='going'
    if (coOrganizerUserIds.length > 0) {
      await db.insert(members).values(
        coOrganizerUserIds.map((coOrgUserId) => ({
          tripId: trip.id,
          userId: coOrgUserId,
          status: 'going' as const,
        }))
      );
    }

    return trip;
  }

  /**
   * Gets a trip by ID with organizer and member information
   * Returns null if trip not found or user is not a member (security best practice)
   * @param tripId - The UUID of the trip to retrieve
   * @param userId - The UUID of the user requesting the trip
   * @returns Promise that resolves to the trip with organizers and memberCount, or null if not found or not authorized
   */
  async getTripById(
    tripId: string,
    userId: string
  ): Promise<(Trip & { organizers: Array<{ id: string; displayName: string; phoneNumber: string; profilePhotoUrl: string | null; timezone: string }>; memberCount: number }) | null> {
    // Check if user is a member of the trip
    const membershipCheck = await db
      .select()
      .from(members)
      .where(and(eq(members.tripId, tripId), eq(members.userId, userId)))
      .limit(1);

    // Return null if user is not a member (security best practice: same response as "not found")
    if (membershipCheck.length === 0) {
      return null;
    }

    // Load the trip
    const tripResult = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);

    // Return null if trip doesn't exist
    if (tripResult.length === 0) {
      return null;
    }

    const trip = tripResult[0];

    // Load organizers: creator + all members with status='going' (co-organizers are added with status='going')
    // Get all members with status='going' (includes creator and co-organizers)
    const organizerMembers = await db
      .select()
      .from(members)
      .where(and(eq(members.tripId, tripId), eq(members.status, 'going')));

    const organizerUserIds = organizerMembers.map((m) => m.userId);

    // Load user information for all organizers
    const organizerUsers = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        phoneNumber: users.phoneNumber,
        profilePhotoUrl: users.profilePhotoUrl,
        timezone: users.timezone,
      })
      .from(users)
      .where(inArray(users.id, organizerUserIds));

    // Load member count
    const memberCount = await this.getMemberCount(tripId);

    // Return enhanced trip object with explicit type assertion
    return {
      ...trip,
      organizers: organizerUsers,
      memberCount,
    } as Trip & {
      organizers: Array<{
        id: string;
        displayName: string;
        phoneNumber: string;
        profilePhotoUrl: string | null;
        timezone: string;
      }>;
      memberCount: number;
    };
  }

  /**
   * Gets all trips for a user with summary information
   * Returns trip summaries for dashboard display
   * @param userId - The UUID of the user
   * @returns Promise that resolves to array of trip summaries ordered by start date
   */
  async getUserTrips(userId: string): Promise<TripSummary[]> {
    // Get all trips where user is a member
    const userMemberships = await db
      .select({
        tripId: members.tripId,
        status: members.status,
      })
      .from(members)
      .where(eq(members.userId, userId));

    // Return empty array if user has no trips
    if (userMemberships.length === 0) {
      return [];
    }

    const tripIds = userMemberships.map((m) => m.tripId);

    // Load all trips for the user
    const userTrips = await db
      .select()
      .from(trips)
      .where(inArray(trips.id, tripIds))
      .orderBy(
        // Order by startDate ascending (upcoming first), NULL last
        sql`CASE WHEN ${trips.startDate} IS NULL THEN 1 ELSE 0 END`,
        asc(trips.startDate)
      );

    // Build trip summaries
    const summaries: TripSummary[] = [];

    for (const trip of userTrips) {
      // Get user's RSVP status from memberships
      const userMembership = userMemberships.find((m) => m.tripId === trip.id);
      const rsvpStatus = userMembership!.status;

      // Determine if user is organizer:
      // - True if user is creator OR
      // - True if user is co-organizer (member with status='going')
      const isCreator = trip.createdBy === userId;
      const isCoOrganizer = !isCreator && rsvpStatus === 'going';
      const isOrganizer = isCreator || isCoOrganizer;

      // Load organizers: all members with status='going'
      const organizerMembers = await db
        .select()
        .from(members)
        .where(and(eq(members.tripId, trip.id), eq(members.status, 'going')));

      const organizerUserIds = organizerMembers.map((m) => m.userId);

      // Load organizer user information
      const organizerUsers = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          profilePhotoUrl: users.profilePhotoUrl,
        })
        .from(users)
        .where(inArray(users.id, organizerUserIds));

      // Get member count
      const memberCount = await this.getMemberCount(trip.id);

      // Build summary
      summaries.push({
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        coverImageUrl: trip.coverImageUrl,
        isOrganizer,
        rsvpStatus,
        organizerInfo: organizerUsers,
        memberCount,
        eventCount: 0, // Events in Phase 5
      });
    }

    return summaries;
  }

  /**
   * Updates a trip
   * Only organizers (creator or co-organizers) can update trips
   * @param tripId - The UUID of the trip to update
   * @param userId - The UUID of the user requesting the update
   * @param data - The trip update data
   * @returns Promise that resolves to the updated trip
   * @throws Error if user lacks permission or trip not found
   */
  async updateTrip(tripId: string, userId: string, data: UpdateTripInput): Promise<Trip> {
    // Check permissions
    const canEdit = await permissionsService.canEditTrip(userId, tripId);
    if (!canEdit) {
      // Check if trip exists to provide better error message
      const tripExists = await db
        .select()
        .from(trips)
        .where(eq(trips.id, tripId))
        .limit(1);

      if (tripExists.length === 0) {
        throw new Error('Trip not found');
      }

      throw new Error('Permission denied: only organizers can update trips');
    }

    // Build update data with field mapping
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    // Map timezone to preferredTimezone if provided
    if (data.timezone !== undefined) {
      updateData.preferredTimezone = data.timezone;
      delete updateData.timezone;
    }

    // Perform update
    const result = await db
      .update(trips)
      .set(updateData)
      .where(eq(trips.id, tripId))
      .returning();

    if (!result[0]) {
      throw new Error('Trip not found');
    }

    return result[0];
  }

  /**
   * Cancels a trip (placeholder implementation)
   * @param _tripId - The UUID of the trip to cancel
   * @returns Promise that resolves when the trip is cancelled
   */
  async cancelTrip(_tripId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Adds co-organizers to a trip (placeholder implementation)
   * @param _tripId - The UUID of the trip
   * @param _phoneNumbers - Array of phone numbers to add as co-organizers
   * @returns Promise that resolves when co-organizers are added
   */
  async addCoOrganizers(_tripId: string, _phoneNumbers: string[]): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Removes a co-organizer from a trip (placeholder implementation)
   * @param _tripId - The UUID of the trip
   * @param _userId - The UUID of the user to remove
   * @returns Promise that resolves when the co-organizer is removed
   */
  async removeCoOrganizer(_tripId: string, _userId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Gets all co-organizers for a trip (placeholder implementation)
   * @param _tripId - The UUID of the trip
   * @returns Promise that resolves to array of user IDs
   */
  async getCoOrganizers(_tripId: string): Promise<string[]> {
    return [];
  }

  /**
   * Gets all members of a trip (placeholder implementation)
   * @param _tripId - The UUID of the trip
   * @returns Promise that resolves to array of members
   */
  async getTripMembers(_tripId: string): Promise<Member[]> {
    return [];
  }

  /**
   * Gets the count of members for a trip
   * @param tripId - The UUID of the trip
   * @returns Promise that resolves to the member count
   */
  async getMemberCount(tripId: string): Promise<number> {
    const memberRecords = await db
      .select()
      .from(members)
      .where(eq(members.tripId, tripId));
    return memberRecords.length;
  }
}

/**
 * Singleton instance of the trip service
 * Use this instance throughout the application
 */
export const tripService = new TripService();
