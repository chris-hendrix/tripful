import { test, expect } from "@playwright/test";
import { createUserViaAPI } from "./helpers/auth";
import {
  createTripViaAPI,
  inviteAndAcceptViaAPI,
  inviteViaAPI,
  rsvpViaAPI,
} from "./helpers/invitations";
import { removeNextjsDevOverlay } from "./helpers/nextjs-dev";
import { API_BASE } from "./helpers/timeouts";

/**
 * E2E: Invitation Helper Verification
 *
 * Validates that the invitation helper functions work correctly
 * by exercising the full invite-and-accept flow via API shortcuts.
 */

test.describe("Invitation Helpers", () => {
  test.beforeEach(async ({ page }) => {
    await removeNextjsDevOverlay(page);
    await page.context().clearCookies();
  });

  test("inviteAndAcceptViaAPI creates member with going status", async ({
    request,
  }) => {
    test.slow();

    const timestamp = Date.now();
    const shortTimestamp = timestamp.toString().slice(-10);
    const organizerPhone = `+1555${shortTimestamp}`;
    const inviteePhone = `+1555${(parseInt(shortTimestamp) + 1000).toString()}`;

    let tripId: string;

    await test.step("create organizer and trip via API", async () => {
      const organizerCookie = await createUserViaAPI(
        request,
        organizerPhone,
        "Organizer",
      );

      tripId = await createTripViaAPI(request, organizerCookie, {
        name: `Helper Test Trip ${timestamp}`,
        destination: "Test City",
      });

      expect(tripId).toBeTruthy();
    });

    await test.step("invite and accept via API helper", async () => {
      await inviteAndAcceptViaAPI(
        request,
        tripId,
        organizerPhone,
        inviteePhone,
        "Invitee User",
      );
    });

    await test.step("verify invitee is a going member", async () => {
      // Authenticate as organizer to check members list
      const organizerCookie = await createUserViaAPI(
        request,
        organizerPhone,
        "Organizer",
      );

      const membersResponse = await request.get(
        `${API_BASE}/trips/${tripId}/members`,
        { headers: { cookie: organizerCookie } },
      );

      expect(membersResponse.ok()).toBeTruthy();

      const membersData = await membersResponse.json();
      const members = membersData.members;

      // Should have 2 members: organizer + invitee
      expect(members.length).toBe(2);

      const inviteeMember = members.find(
        (m: { phoneNumber: string }) => m.phoneNumber === inviteePhone,
      );
      expect(inviteeMember).toBeDefined();
      expect(inviteeMember.status).toBe("going");
      expect(inviteeMember.displayName).toBe("Invitee User");
    });
  });

  test("lower-level helpers work independently", async ({ request }) => {
    test.slow();

    const timestamp = Date.now();
    const shortTimestamp = (timestamp + 50000).toString().slice(-10);
    const organizerPhone = `+1555${shortTimestamp}`;
    const inviteePhone = `+1555${(parseInt(shortTimestamp) + 1000).toString()}`;

    let tripId: string;
    let organizerCookie: string;

    await test.step("setup organizer and trip", async () => {
      organizerCookie = await createUserViaAPI(
        request,
        organizerPhone,
        "Organizer 2",
      );

      tripId = await createTripViaAPI(request, organizerCookie, {
        name: `Lower Level Test ${timestamp}`,
        destination: "Another City",
        startDate: "2026-11-01",
        endDate: "2026-11-05",
      });

      expect(tripId).toBeTruthy();
    });

    await test.step("inviteViaAPI sends invitation", async () => {
      const result = await inviteViaAPI(request, tripId, organizerCookie, [
        inviteePhone,
      ]);

      expect(result.success).toBe(true);
      expect(result.invitations.length).toBe(1);
      expect(result.skipped.length).toBe(0);
    });

    await test.step("authenticate invitee and RSVP via API", async () => {
      // Authenticate the invitee (triggers processPendingInvitations)
      const inviteeCookie = await createUserViaAPI(
        request,
        inviteePhone,
        "Invitee 2",
      );

      const result = await rsvpViaAPI(request, tripId, inviteeCookie, "maybe");

      expect(result.success).toBe(true);
    });

    await test.step("verify invitee has maybe status", async () => {
      // Re-authenticate organizer to check members
      organizerCookie = await createUserViaAPI(
        request,
        organizerPhone,
        "Organizer 2",
      );

      const membersResponse = await request.get(
        `${API_BASE}/trips/${tripId}/members`,
        { headers: { cookie: organizerCookie } },
      );

      expect(membersResponse.ok()).toBeTruthy();

      const membersData = await membersResponse.json();
      const inviteeMember = membersData.members.find(
        (m: { phoneNumber: string }) => m.phoneNumber === inviteePhone,
      );

      expect(inviteeMember).toBeDefined();
      expect(inviteeMember.status).toBe("maybe");
    });
  });
});
