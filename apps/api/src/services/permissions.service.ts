import { trips, members } from "@/db/schema/index.js";
import { eq, and, or } from "drizzle-orm";
import type { AppDatabase } from "@/types/index.js";

/**
 * Permissions Service Interface
 * Defines the contract for authorization and permission checking operations
 */
export interface IPermissionsService {
  /**
   * Checks if a user can edit a trip
   * A user can edit a trip if they are the creator OR a co-organizer (member with status='going')
   * @param userId - The UUID of the user to check
   * @param tripId - The UUID of the trip to check
   * @returns Promise that resolves to true if user can edit, false otherwise
   */
  canEditTrip(userId: string, tripId: string): Promise<boolean>;

  /**
   * Checks if a user can delete a trip
   * A user can delete a trip if they are the creator OR a co-organizer (member with status='going')
   * @param userId - The UUID of the user to check
   * @param tripId - The UUID of the trip to check
   * @returns Promise that resolves to true if user can delete, false otherwise
   */
  canDeleteTrip(userId: string, tripId: string): Promise<boolean>;

  /**
   * Checks if a user can manage co-organizers for a trip
   * A user can manage co-organizers if they are the creator OR a co-organizer (member with status='going')
   * @param userId - The UUID of the user to check
   * @param tripId - The UUID of the trip to check
   * @returns Promise that resolves to true if user can manage co-organizers, false otherwise
   */
  canManageCoOrganizers(userId: string, tripId: string): Promise<boolean>;

  /**
   * Checks if a user is an organizer of a trip
   * A user is an organizer if they are the creator OR a co-organizer (member with status='going')
   * @param userId - The UUID of the user to check
   * @param tripId - The UUID of the trip to check
   * @returns Promise that resolves to true if user is an organizer, false otherwise
   */
  isOrganizer(userId: string, tripId: string): Promise<boolean>;

  /**
   * Checks if a user is a member of a trip
   * A user is a member if they have a record in the members table for the trip
   * @param userId - The UUID of the user to check
   * @param tripId - The UUID of the trip to check
   * @returns Promise that resolves to true if user is a member, false otherwise
   */
  isMember(userId: string, tripId: string): Promise<boolean>;
}

/**
 * Permissions Service Implementation
 * Handles authorization and permission checking for trip-related operations
 */
export class PermissionsService implements IPermissionsService {
  constructor(private db: AppDatabase) {}

  /**
   * Checks if a user is an organizer of a trip
   * A user is an organizer if:
   * 1. They are the trip creator (trips.createdBy matches userId), OR
   * 2. They are a co-organizer (member with status='going')
   *
   * Uses a LEFT JOIN to check both conditions in a single query
   * @param userId - The UUID of the user to check
   * @param tripId - The UUID of the trip to check
   * @returns true if user is an organizer, false otherwise
   */
  async isOrganizer(userId: string, tripId: string): Promise<boolean> {
    const result = await this.db
      .select({
        tripId: trips.id,
        createdBy: trips.createdBy,
        memberUserId: members.userId,
        memberStatus: members.status,
      })
      .from(trips)
      .leftJoin(
        members,
        and(
          eq(members.tripId, trips.id),
          eq(members.userId, userId),
          eq(members.status, "going"),
        ),
      )
      .where(
        and(
          eq(trips.id, tripId),
          or(
            eq(trips.createdBy, userId), // User is the creator
            eq(members.userId, userId), // User is a co-organizer (status='going' from JOIN)
          ),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Checks if a user is a member of a trip
   * A user is a member if they have any record in the members table for the trip
   * @param userId - The UUID of the user to check
   * @param tripId - The UUID of the trip to check
   * @returns true if user is a member, false otherwise
   */
  async isMember(userId: string, tripId: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(members)
      .where(and(eq(members.tripId, tripId), eq(members.userId, userId)))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Checks if a user can edit a trip
   * Delegates to isOrganizer - only organizers can edit trips
   */
  async canEditTrip(userId: string, tripId: string): Promise<boolean> {
    return this.isOrganizer(userId, tripId);
  }

  /**
   * Checks if a user can delete a trip
   * Delegates to isOrganizer - only organizers can delete trips
   */
  async canDeleteTrip(userId: string, tripId: string): Promise<boolean> {
    return this.isOrganizer(userId, tripId);
  }

  /**
   * Checks if a user can manage co-organizers for a trip
   * Delegates to isOrganizer - only organizers can manage co-organizers
   */
  async canManageCoOrganizers(
    userId: string,
    tripId: string,
  ): Promise<boolean> {
    return this.isOrganizer(userId, tripId);
  }
}
