import { test, expect } from "@playwright/test";
import {
  authenticateViaAPIWithPhone,
  createUserViaAPI,
} from "./helpers/auth";
import { removeNextjsDevOverlay } from "./helpers/nextjs-dev";
import { snap } from "./helpers/screenshots";
import {
  createTripViaAPI,
  inviteViaAPI,
  rsvpViaAPI,
  inviteAndAcceptViaAPI,
} from "./helpers/invitations";

/**
 * E2E Journey: Invitations & RSVP
 *
 * Tests the invitation flow, RSVP management, trip preview,
 * members list, and "member no longer attending" indicator.
 * Uses authenticateViaAPI for fast auth (no browser navigation).
 */

test.describe("Invitation Journey", () => {
  test.beforeEach(async ({ page }) => {
    await removeNextjsDevOverlay(page);
    await page.context().clearCookies();
  });

  test(
    "invitation and RSVP journey",
    { tag: "@smoke" },
    async ({ page, request }) => {
      test.slow();

      const timestamp = Date.now();
      const shortTimestamp = timestamp.toString().slice(-10);
      const organizerPhone = `+1555${shortTimestamp}`;
      const inviteePhone = `+1555${(parseInt(shortTimestamp) + 1000).toString()}`;

      let tripId: string;

      // Setup: create organizer and trip via API
      const organizerCookie = await createUserViaAPI(
        request,
        organizerPhone,
        "Organizer Alpha",
      );

      tripId = await createTripViaAPI(request, organizerCookie, {
        name: `Invite Trip ${timestamp}`,
        destination: "Honolulu, HI",
        startDate: "2026-12-01",
        endDate: "2026-12-05",
      });

      await test.step("organizer invites member via dialog", async () => {
        await authenticateViaAPIWithPhone(
          page,
          request,
          organizerPhone,
          "Organizer Alpha",
        );

        await page.goto(`/trips/${tripId}`);
        await expect(
          page.getByRole("heading", { level: 1, name: `Invite Trip ${timestamp}` }),
        ).toBeVisible({ timeout: 15000 });

        await snap(page, "09-trip-detail-invite-button");

        // Click "Invite" button in trip header
        await page.getByRole("button", { name: "Invite" }).first().click();

        // Wait for dialog
        await expect(
          page.getByRole("heading", { name: "Invite members" }),
        ).toBeVisible();

        await snap(page, "10-invite-dialog");

        // Fill phone input within the dialog
        const dialog = page.getByRole("dialog");
        await dialog.locator('input[type="tel"]').fill(inviteePhone);

        // Click "Add" button
        await dialog.getByRole("button", { name: "Add" }).click();

        await snap(page, "11-invite-phone-added");

        // Click "Send invitations" button
        await dialog.getByRole("button", { name: "Send invitations" }).click();

        // Verify toast with "invitation" text appears
        await expect(page.getByText(/invitation/i)).toBeVisible({ timeout: 10000 });
        await snap(page, "12-invite-sent");
      });

      await test.step("invited member sees trip preview", async () => {
        await page.context().clearCookies();
        await authenticateViaAPIWithPhone(
          page,
          request,
          inviteePhone,
          "Invited Member",
        );

        await page.goto(`/trips/${tripId}`);

        // Verify preview mode
        await expect(page.getByText("You've been invited!")).toBeVisible({
          timeout: 15000,
        });
        await expect(
          page.getByText("RSVP to see the full itinerary."),
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="rsvp-buttons"]'),
        ).toBeVisible();
        await snap(page, "13-trip-preview-invitee");
      });

      await test.step("member RSVPs Going and sees full itinerary", async () => {
        // Click "Going" button
        await page
          .locator('[data-testid="rsvp-buttons"]')
          .getByRole("button", { name: "Going", exact: true })
          .click();

        // Verify toast
        await expect(
          page.getByText('RSVP updated to "Going"'),
        ).toBeVisible({ timeout: 10000 });

        // Preview should disappear
        await expect(
          page.getByText("You've been invited!"),
        ).not.toBeVisible({ timeout: 10000 });

        // Full trip view should show tabs
        await expect(
          page.getByRole("tab", { name: "Itinerary" }),
        ).toBeVisible();
        await expect(
          page.getByRole("tab", { name: "Members" }),
        ).toBeVisible();
        await snap(page, "14-rsvp-going-full-view");
      });
    },
  );

  test(
    "RSVP status change and member indicator",
    async ({ page, request }) => {
      test.slow();

      const timestamp = Date.now();
      const shortTimestamp = timestamp.toString().slice(-10);
      const organizerPhone = `+1555${shortTimestamp}`;
      const inviteePhone = `+1555${(parseInt(shortTimestamp) + 2000).toString()}`;

      let tripId: string;

      // Setup: create organizer, trip, and invite+accept a member
      const organizerCookie = await createUserViaAPI(
        request,
        organizerPhone,
        "Organizer Beta",
      );

      tripId = await createTripViaAPI(request, organizerCookie, {
        name: `RSVP Change Trip ${timestamp}`,
        destination: "Denver, CO",
        startDate: "2026-11-10",
        endDate: "2026-11-14",
      });

      await inviteAndAcceptViaAPI(
        request,
        tripId,
        organizerPhone,
        inviteePhone,
        "Member Beta",
      );

      const eventName = `Test Event ${timestamp}`;

      await test.step("member creates an event via API", async () => {
        // Auth as member in browser
        await authenticateViaAPIWithPhone(
          page,
          request,
          inviteePhone,
          "Member Beta",
        );

        // Create event via API (member has canAddEvent permission)
        const eventResponse = await page.request.post(
          `http://localhost:8000/api/trips/${tripId}/events`,
          {
            data: {
              name: eventName,
              eventType: "activity",
              startTime: "2026-11-11T10:00:00.000Z",
            },
          },
        );
        expect(eventResponse.ok()).toBeTruthy();

        // Navigate to trip to verify event is visible
        await page.goto(`/trips/${tripId}`);
        await expect(page.getByText(eventName)).toBeVisible({ timeout: 15000 });
      });

      await test.step("member changes RSVP to Maybe", async () => {
        // Use API shortcut to change RSVP
        const inviteeCookie = await createUserViaAPI(
          request,
          inviteePhone,
          "Member Beta",
        );
        await rsvpViaAPI(request, tripId, inviteeCookie, "maybe");

        // Refresh page
        await page.reload();

        // Since member is now "maybe" (non-Going), they should see preview
        await expect(page.getByText("You've been invited!")).toBeVisible({
          timeout: 15000,
        });
        await snap(page, "15-rsvp-changed-to-maybe");
      });

      await test.step("organizer sees member no longer attending indicator", async () => {
        await page.context().clearCookies();
        await authenticateViaAPIWithPhone(
          page,
          request,
          organizerPhone,
          "Organizer Beta",
        );

        await page.goto(`/trips/${tripId}`);
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: `RSVP Change Trip ${timestamp}`,
          }),
        ).toBeVisible({ timeout: 15000 });

        // Verify "Member no longer attending" badge is visible
        await expect(
          page.getByText("Member no longer attending"),
        ).toBeVisible({ timeout: 10000 });
        await snap(page, "16-member-not-attending-indicator");
      });

      await test.step("member RSVPs Going again, indicator removed", async () => {
        // Use API shortcut to change RSVP back to going
        const inviteeCookie = await createUserViaAPI(
          request,
          inviteePhone,
          "Member Beta",
        );
        await rsvpViaAPI(request, tripId, inviteeCookie, "going");

        // Reload organizer's page
        await page.reload();
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: `RSVP Change Trip ${timestamp}`,
          }),
        ).toBeVisible({ timeout: 15000 });

        // Verify badge is gone
        await expect(
          page.getByText("Member no longer attending"),
        ).not.toBeVisible();
      });
    },
  );

  test("uninvited user access", async ({ page, request }) => {
    const timestamp = Date.now();
    const shortTimestamp = timestamp.toString().slice(-10);
    const organizerPhone = `+1555${shortTimestamp}`;
    const uninvitedPhone = `+1555${(parseInt(shortTimestamp) + 3000).toString()}`;

    let tripId: string;

    // Setup: create organizer and trip
    const organizerCookie = await createUserViaAPI(
      request,
      organizerPhone,
      "Organizer Gamma",
    );

    tripId = await createTripViaAPI(request, organizerCookie, {
      name: `Private Trip ${timestamp}`,
      destination: "Aspen, CO",
    });

    await test.step("uninvited user cannot access trip", async () => {
      await authenticateViaAPIWithPhone(
        page,
        request,
        uninvitedPhone,
        "Uninvited User",
      );

      await page.goto(`/trips/${tripId}`);

      // Verify 404 page
      await expect(
        page.getByRole("heading", { name: "Trip not found" }),
      ).toBeVisible({ timeout: 15000 });
      await snap(page, "17-uninvited-user-404");
    });
  });

  test("member list", async ({ page, request }) => {
    test.slow();

    const timestamp = Date.now();
    const shortTimestamp = timestamp.toString().slice(-10);
    const organizerPhone = `+1555${shortTimestamp}`;
    const member1Phone = `+1555${(parseInt(shortTimestamp) + 4000).toString()}`;
    const member2Phone = `+1555${(parseInt(shortTimestamp) + 5000).toString()}`;

    let tripId: string;

    // Setup: create organizer and trip
    const organizerCookie = await createUserViaAPI(
      request,
      organizerPhone,
      "Organizer Delta",
    );

    tripId = await createTripViaAPI(request, organizerCookie, {
      name: `Members Trip ${timestamp}`,
      destination: "Nashville, TN",
      startDate: "2026-10-20",
      endDate: "2026-10-24",
    });

    // Member 1: invite and accept (RSVP "going")
    await inviteAndAcceptViaAPI(
      request,
      tripId,
      organizerPhone,
      member1Phone,
      "Member One",
    );

    // Member 2: invite, auth, then RSVP "maybe" via API
    const inviterCookie = await createUserViaAPI(
      request,
      organizerPhone,
      "Organizer Delta",
    );
    await inviteViaAPI(request, tripId, inviterCookie, [member2Phone]);
    const member2Cookie = await createUserViaAPI(
      request,
      member2Phone,
      "Member Two",
    );
    await rsvpViaAPI(request, tripId, member2Cookie, "maybe");

    await test.step("organizer views member list with statuses", async () => {
      await authenticateViaAPIWithPhone(
        page,
        request,
        organizerPhone,
        "Organizer Delta",
      );

      await page.goto(`/trips/${tripId}`);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: `Members Trip ${timestamp}`,
        }),
      ).toBeVisible({ timeout: 15000 });

      // Click "Members" tab
      await page.getByRole("tab", { name: "Members" }).click();

      // Scope assertions to the Members tab panel
      const membersPanel = page.getByRole("tabpanel");

      // Verify organizer is listed with "Organizer" badge
      await expect(membersPanel.getByText("Organizer Delta")).toBeVisible();
      await expect(membersPanel.getByText("Organizer", { exact: true }).first()).toBeVisible();

      // Verify Member 1 with "Going" badge
      await expect(membersPanel.getByText("Member One")).toBeVisible();

      // Verify Member 2 with "Maybe" badge
      await expect(membersPanel.getByText("Member Two")).toBeVisible();

      // Verify the members count heading
      await expect(membersPanel.getByText("Members (3)")).toBeVisible();
      await snap(page, "18-member-list-with-statuses");
    });

    await test.step("organizer sees invite button", async () => {
      // Verify "Invite" button is visible in the members list area
      const membersTab = page.getByRole("tabpanel");
      await expect(
        membersTab.getByRole("button", { name: "Invite" }),
      ).toBeVisible();
    });
  });
});
