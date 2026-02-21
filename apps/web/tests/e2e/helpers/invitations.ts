import type { APIRequestContext } from "@playwright/test";
import { createUserViaAPI } from "./auth";
import { API_BASE } from "./timeouts";

/**
 * Create a trip via API.
 * Returns the trip ID for use in subsequent API calls.
 */
export async function createTripViaAPI(
  request: APIRequestContext,
  organizerCookie: string,
  tripData: {
    name: string;
    destination: string;
    timezone?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  },
): Promise<string> {
  const response = await request.post(`${API_BASE}/trips`, {
    data: {
      timezone: "UTC",
      ...tripData,
    },
    headers: { cookie: organizerCookie },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Failed to create trip: ${response.status()} ${response.statusText()} - ${body}`,
    );
  }

  const json = await response.json();
  return json.trip.id;
}

/**
 * Send batch invitations for a trip via API.
 * Requires the inviter's auth cookie (must be an organizer of the trip).
 * Returns the response data containing invitations and skipped entries.
 */
export async function inviteViaAPI(
  request: APIRequestContext,
  tripId: string,
  inviterCookie: string,
  inviteePhones: string[],
): Promise<{
  success: boolean;
  invitations: unknown[];
  skipped: unknown[];
}> {
  const response = await request.post(
    `${API_BASE}/trips/${tripId}/invitations`,
    {
      data: { phoneNumbers: inviteePhones },
      headers: { cookie: inviterCookie },
    },
  );

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Failed to create invitations: ${response.status()} ${response.statusText()} - ${body}`,
    );
  }

  return response.json();
}

/**
 * Update RSVP status for a trip via API.
 * Requires the member's auth cookie.
 * Returns the response data containing the updated member record.
 */
export async function rsvpViaAPI(
  request: APIRequestContext,
  tripId: string,
  memberCookie: string,
  status: "going" | "not_going" | "maybe",
): Promise<{
  success: boolean;
  member: unknown;
}> {
  const response = await request.post(`${API_BASE}/trips/${tripId}/rsvp`, {
    data: { status },
    headers: { cookie: memberCookie },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Failed to update RSVP: ${response.status()} ${response.statusText()} - ${body}`,
    );
  }

  return response.json();
}

/**
 * Invite a user to a trip and accept the invitation via API.
 * Handles the full flow: invite -> authenticate invitee -> RSVP "going".
 *
 * Works for both new users (who don't exist yet) and existing users.
 * The auth flow (createUserViaAPI) handles both cases since verify-code
 * issues a new token regardless.
 *
 * Important ordering:
 * 1. Re-authenticate inviter to get a fresh cookie
 * 2. Send invitation (creates invitation record)
 * 3. Authenticate invitee (verify-code triggers processPendingInvitations,
 *    which finds the pending invitation and creates the member record)
 * 4. RSVP as "going" with the invitee's cookie
 */
export async function inviteAndAcceptViaAPI(
  request: APIRequestContext,
  tripId: string,
  inviterPhone: string,
  inviteePhone: string,
  inviteeName: string,
): Promise<void> {
  // Step 1: Re-authenticate the inviter to get a fresh cookie
  const inviterCookie = await createUserViaAPI(request, inviterPhone);

  // Step 2: Send the invitation
  await inviteViaAPI(request, tripId, inviterCookie, [inviteePhone]);

  // Step 3: Authenticate the invitee (triggers processPendingInvitations)
  const inviteeCookie = await createUserViaAPI(
    request,
    inviteePhone,
    inviteeName,
  );

  // Step 4: RSVP as "going"
  await rsvpViaAPI(request, tripId, inviteeCookie, "going");
}
