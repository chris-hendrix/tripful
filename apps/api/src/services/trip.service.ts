import { db } from '@/config/database.js';
import { trips, members, users, type Trip, type Member } from '@/db/schema/index.js';
import { eq, inArray } from 'drizzle-orm';
import type { CreateTripInput } from '../../../../shared/schemas/index.js';

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
   * Gets a trip by ID (to be implemented)
   * @param tripId - The UUID of the trip to retrieve
   * @returns Promise that resolves to the trip or null if not found
   */
  getTripById(tripId: string): Promise<Trip | null>;

  /**
   * Gets all trips for a user (to be implemented)
   * @param userId - The UUID of the user
   * @returns Promise that resolves to array of trips
   */
  getUserTrips(userId: string): Promise<Trip[]>;

  /**
   * Updates a trip (to be implemented)
   * @param tripId - The UUID of the trip to update
   * @param data - The trip update data
   * @returns Promise that resolves to the updated trip
   */
  updateTrip(tripId: string, data: Partial<CreateTripInput>): Promise<Trip>;

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
   * Gets a trip by ID (placeholder implementation)
   * @param tripId - The UUID of the trip to retrieve
   * @returns Promise that resolves to the trip or null if not found
   */
  async getTripById(tripId: string): Promise<Trip | null> {
    const result = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
    return result[0] || null;
  }

  /**
   * Gets all trips for a user (placeholder implementation)
   * @param _userId - The UUID of the user
   * @returns Promise that resolves to array of trips
   */
  async getUserTrips(_userId: string): Promise<Trip[]> {
    return [];
  }

  /**
   * Updates a trip (placeholder implementation)
   * @param _tripId - The UUID of the trip to update
   * @param _data - The trip update data
   * @returns Promise that resolves to the updated trip
   */
  async updateTrip(_tripId: string, _data: Partial<CreateTripInput>): Promise<Trip> {
    throw new Error('Not implemented');
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
   * Gets the count of members for a trip (placeholder implementation)
   * @param _tripId - The UUID of the trip
   * @returns Promise that resolves to the member count
   */
  async getMemberCount(_tripId: string): Promise<number> {
    return 0;
  }
}

/**
 * Singleton instance of the trip service
 * Use this instance throughout the application
 */
export const tripService = new TripService();
