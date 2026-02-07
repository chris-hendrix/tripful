import {
  trips,
  members,
  events,
  accommodations,
  memberTravel,
} from "@/db/schema/index.js";
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

  /**
   * Checks if a user can add an event to a trip
   * A user can add an event if they are:
   * 1. An organizer (creator OR co-organizer with status='going'), OR
   * 2. A member with status='going' AND trip.allowMembersToAddEvents=true
   * @param userId - The UUID of the user to check
   * @param tripId - The UUID of the trip to check
   * @returns Promise that resolves to true if user can add event, false otherwise
   */
  canAddEvent(userId: string, tripId: string): Promise<boolean>;

  /**
   * Checks if a user can edit an event
   * A user can edit an event if they are:
   * 1. The event creator (events.createdBy), OR
   * 2. An organizer of the event's trip
   * @param userId - The UUID of the user to check
   * @param eventId - The UUID of the event to check
   * @returns Promise that resolves to true if user can edit event, false otherwise
   */
  canEditEvent(userId: string, eventId: string): Promise<boolean>;

  /**
   * Checks if a user can delete an event
   * A user can delete an event if they are:
   * 1. The event creator (events.createdBy), OR
   * 2. An organizer of the event's trip
   * @param userId - The UUID of the user to check
   * @param eventId - The UUID of the event to check
   * @returns Promise that resolves to true if user can delete event, false otherwise
   */
  canDeleteEvent(userId: string, eventId: string): Promise<boolean>;

  /**
   * Checks if a user can add accommodation to a trip
   * Only organizers (creator OR co-organizer with status='going') can add accommodations
   * @param userId - The UUID of the user to check
   * @param tripId - The UUID of the trip to check
   * @returns Promise that resolves to true if user can add accommodation, false otherwise
   */
  canAddAccommodation(userId: string, tripId: string): Promise<boolean>;

  /**
   * Checks if a user can edit an accommodation
   * Only organizers of the accommodation's trip can edit accommodations
   * @param userId - The UUID of the user to check
   * @param accommodationId - The UUID of the accommodation to check
   * @returns Promise that resolves to true if user can edit accommodation, false otherwise
   */
  canEditAccommodation(
    userId: string,
    accommodationId: string,
  ): Promise<boolean>;

  /**
   * Checks if a user can delete an accommodation
   * Only organizers of the accommodation's trip can delete accommodations
   * @param userId - The UUID of the user to check
   * @param accommodationId - The UUID of the accommodation to check
   * @returns Promise that resolves to true if user can delete accommodation, false otherwise
   */
  canDeleteAccommodation(
    userId: string,
    accommodationId: string,
  ): Promise<boolean>;

  /**
   * Checks if a user can add member travel to a trip
   * Any member (with any status) can add member travel
   * @param userId - The UUID of the user to check
   * @param tripId - The UUID of the trip to check
   * @returns Promise that resolves to true if user can add member travel, false otherwise
   */
  canAddMemberTravel(userId: string, tripId: string): Promise<boolean>;

  /**
   * Checks if a user can edit member travel
   * A user can edit member travel if they are:
   * 1. The owner (memberId.userId = userId), OR
   * 2. An organizer of the trip
   * @param userId - The UUID of the user to check
   * @param memberTravelId - The UUID of the member travel to check
   * @returns Promise that resolves to true if user can edit member travel, false otherwise
   */
  canEditMemberTravel(userId: string, memberTravelId: string): Promise<boolean>;

  /**
   * Checks if a user can delete member travel
   * A user can delete member travel if they are:
   * 1. The owner (memberId.userId = userId), OR
   * 2. An organizer of the trip
   * @param userId - The UUID of the user to check
   * @param memberTravelId - The UUID of the member travel to check
   * @returns Promise that resolves to true if user can delete member travel, false otherwise
   */
  canDeleteMemberTravel(
    userId: string,
    memberTravelId: string,
  ): Promise<boolean>;
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

  /**
   * Helper method to check if a user is the creator of an event
   * @param userId - The UUID of the user to check
   * @param eventId - The UUID of the event to check
   * @returns true if user created the event, false otherwise
   */
  private async isEventCreator(
    userId: string,
    eventId: string,
  ): Promise<boolean> {
    const result = await this.db
      .select({ createdBy: events.createdBy })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    return result.length > 0 && result[0]!.createdBy === userId;
  }

  /**
   * Helper method to get the tripId for an event
   * @param eventId - The UUID of the event
   * @returns tripId if event exists, null otherwise
   */
  private async getEventTripId(eventId: string): Promise<string | null> {
    const result = await this.db
      .select({ tripId: events.tripId })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    return result.length > 0 ? result[0]!.tripId : null;
  }

  /**
   * Helper method to get the tripId for an accommodation
   * @param accommodationId - The UUID of the accommodation
   * @returns tripId if accommodation exists, null otherwise
   */
  private async getAccommodationTripId(
    accommodationId: string,
  ): Promise<string | null> {
    const result = await this.db
      .select({ tripId: accommodations.tripId })
      .from(accommodations)
      .where(eq(accommodations.id, accommodationId))
      .limit(1);

    return result.length > 0 ? result[0]!.tripId : null;
  }

  /**
   * Helper method to check if a user is the owner of member travel
   * Member travel is owned by the user if memberTravel.memberId references a member record
   * where members.userId = userId
   * @param userId - The UUID of the user to check
   * @param memberTravelId - The UUID of the member travel to check
   * @returns true if user owns the member travel, false otherwise
   */
  private async isMemberTravelOwner(
    userId: string,
    memberTravelId: string,
  ): Promise<boolean> {
    const result = await this.db
      .select({ userId: members.userId })
      .from(memberTravel)
      .innerJoin(members, eq(memberTravel.memberId, members.id))
      .where(eq(memberTravel.id, memberTravelId))
      .limit(1);

    return result.length > 0 && result[0]!.userId === userId;
  }

  /**
   * Helper method to get the tripId for member travel
   * @param memberTravelId - The UUID of the member travel
   * @returns tripId if member travel exists, null otherwise
   */
  private async getMemberTravelTripId(
    memberTravelId: string,
  ): Promise<string | null> {
    const result = await this.db
      .select({ tripId: memberTravel.tripId })
      .from(memberTravel)
      .where(eq(memberTravel.id, memberTravelId))
      .limit(1);

    return result.length > 0 ? result[0]!.tripId : null;
  }

  /**
   * Checks if a user can add an event to a trip
   * A user can add an event if they are:
   * 1. An organizer (creator OR co-organizer with status='going'), OR
   * 2. A regular member with status='going' AND trip.allowMembersToAddEvents=true
   */
  async canAddEvent(userId: string, tripId: string): Promise<boolean> {
    // First check if user is an organizer (covers both creator and co-organizers)
    // Organizers always have permission to add events
    if (await this.isOrganizer(userId, tripId)) {
      return true;
    }

    // Check if user is a regular member with status='going' AND allowMembersToAddEvents is enabled
    const result = await this.db
      .select({
        allowMembersToAddEvents: trips.allowMembersToAddEvents,
        memberStatus: members.status,
      })
      .from(trips)
      .innerJoin(
        members,
        and(
          eq(members.tripId, trips.id),
          eq(members.userId, userId),
          eq(members.status, "going"),
        ),
      )
      .where(eq(trips.id, tripId))
      .limit(1);

    if (result.length === 0) {
      return false;
    }

    return result[0]!.allowMembersToAddEvents;
  }

  /**
   * Checks if a user can edit an event
   * A user can edit an event if they are the event creator OR an organizer of the trip
   */
  async canEditEvent(userId: string, eventId: string): Promise<boolean> {
    // Check if user is the event creator
    if (await this.isEventCreator(userId, eventId)) {
      return true;
    }

    // Check if user is an organizer of the event's trip
    const tripId = await this.getEventTripId(eventId);
    if (!tripId) {
      return false;
    }

    return this.isOrganizer(userId, tripId);
  }

  /**
   * Checks if a user can delete an event
   * Uses same logic as canEditEvent
   */
  async canDeleteEvent(userId: string, eventId: string): Promise<boolean> {
    return this.canEditEvent(userId, eventId);
  }

  /**
   * Checks if a user can add accommodation to a trip
   * Only organizers can add accommodations
   */
  async canAddAccommodation(userId: string, tripId: string): Promise<boolean> {
    return this.isOrganizer(userId, tripId);
  }

  /**
   * Checks if a user can edit an accommodation
   * Only organizers of the accommodation's trip can edit
   */
  async canEditAccommodation(
    userId: string,
    accommodationId: string,
  ): Promise<boolean> {
    const tripId = await this.getAccommodationTripId(accommodationId);
    if (!tripId) {
      return false;
    }

    return this.isOrganizer(userId, tripId);
  }

  /**
   * Checks if a user can delete an accommodation
   * Uses same logic as canEditAccommodation
   */
  async canDeleteAccommodation(
    userId: string,
    accommodationId: string,
  ): Promise<boolean> {
    return this.canEditAccommodation(userId, accommodationId);
  }

  /**
   * Checks if a user can add member travel to a trip
   * Any member (with any status) can add member travel
   */
  async canAddMemberTravel(userId: string, tripId: string): Promise<boolean> {
    return this.isMember(userId, tripId);
  }

  /**
   * Checks if a user can edit member travel
   * A user can edit if they are the owner OR an organizer of the trip
   */
  async canEditMemberTravel(
    userId: string,
    memberTravelId: string,
  ): Promise<boolean> {
    // Check if user is the owner
    if (await this.isMemberTravelOwner(userId, memberTravelId)) {
      return true;
    }

    // Check if user is an organizer of the trip
    const tripId = await this.getMemberTravelTripId(memberTravelId);
    if (!tripId) {
      return false;
    }

    return this.isOrganizer(userId, tripId);
  }

  /**
   * Checks if a user can delete member travel
   * Uses same logic as canEditMemberTravel
   */
  async canDeleteMemberTravel(
    userId: string,
    memberTravelId: string,
  ): Promise<boolean> {
    return this.canEditMemberTravel(userId, memberTravelId);
  }
}
