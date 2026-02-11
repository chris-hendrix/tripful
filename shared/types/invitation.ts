/**
 * Invitation and RSVP types and response interfaces
 */

/**
 * Invitation entity
 */
export interface Invitation {
  id: string;
  tripId: string;
  inviterId: string;
  inviteePhone: string;
  status: "pending" | "accepted" | "declined" | "failed";
  sentAt: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Member with profile information (for member list endpoint)
 */
export interface MemberWithProfile {
  id: string;
  userId: string;
  displayName: string;
  profilePhotoUrl: string | null;
  /** Only included when requesting user is an organizer */
  phoneNumber?: string;
  status: "going" | "not_going" | "maybe" | "no_response";
  isOrganizer: boolean;
  createdAt: string;
}

/**
 * API response for batch invitation creation
 */
export interface CreateInvitationsResponse {
  success: true;
  invitations: Invitation[];
  skipped: string[];
}

/**
 * API response for fetching invitations
 */
export interface GetInvitationsResponse {
  success: true;
  invitations: Invitation[];
}

/**
 * API response for RSVP status update
 */
export interface UpdateRsvpResponse {
  success: true;
  member: MemberWithProfile;
}

/**
 * API response for fetching trip members
 */
export interface GetMembersResponse {
  success: true;
  members: MemberWithProfile[];
}
