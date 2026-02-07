// Trip-related types for the Tripful platform

/**
 * Trip type from database schema
 * Matches the Trip type from apps/api/src/db/schema/index.ts
 */
export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  preferredTimezone: string;
  description: string | null;
  coverImageUrl: string | null;
  createdBy: string;
  allowMembersToAddEvents: boolean;
  cancelled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Trip summary type returned by GET /api/trips
 * Used for dashboard display with minimal data
 */
export interface TripSummary {
  id: string;
  name: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  coverImageUrl: string | null;
  isOrganizer: boolean;
  rsvpStatus: "going" | "not_going" | "maybe" | "no_response";
  organizerInfo: Array<{
    id: string;
    displayName: string;
    profilePhotoUrl: string | null;
  }>;
  memberCount: number;
  eventCount: number;
}

/**
 * Trip detail type returned by GET /api/trips/:id
 * Extends the base Trip type with organizers and member count
 */
export interface TripDetail extends Trip {
  organizers: Array<{
    id: string;
    displayName: string;
    phoneNumber: string;
    profilePhotoUrl: string | null;
    timezone: string;
  }>;
  memberCount: number;
}

/**
 * API response type for fetching trips list (paginated)
 */
export interface GetTripsResponse {
  success: true;
  data: TripSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * API response type for fetching trip detail
 */
export interface GetTripResponse {
  success: true;
  trip: TripDetail;
}

/**
 * API response type for trip creation
 */
export interface CreateTripResponse {
  success: true;
  trip: Trip;
}

/**
 * API response type for trip update
 */
export interface UpdateTripResponse {
  success: true;
  trip: Trip;
}
