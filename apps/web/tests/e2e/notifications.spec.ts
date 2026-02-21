import { test, expect } from "@playwright/test";
import {
  authenticateViaAPIWithPhone,
  createUserViaAPI,
  generateUniquePhone,
} from "./helpers/auth";
import {
  createTripViaAPI,
  inviteViaAPI,
  rsvpViaAPI,
} from "./helpers/invitations";
import { removeNextjsDevOverlay } from "./helpers/nextjs-dev";
import { snap } from "./helpers/screenshots";
import {
  NAVIGATION_TIMEOUT,
  ELEMENT_TIMEOUT,
  DIALOG_TIMEOUT,
} from "./helpers/timeouts";
import { dismissToast } from "./helpers/toast";

/**
 * E2E Journey: Notification Flows
 *
 * Consolidates notification scenarios into 3 journey tests.
 * Notifications are created by posting messages (which triggers
 * notifyTripMembers for all other "going" members).
 */

const API_BASE = "http://localhost:8000/api";

test.describe("Notification Journey", () => {
  test.beforeEach(async ({ page }) => {
    await removeNextjsDevOverlay(page);
    await page.context().clearCookies();
  });

  test(
    "notification bell and dropdown journey",
    { tag: ["@smoke", "@slow"] },
    async ({ page, request }) => {
      test.slow(); // Multiple auth cycles and polling waits

      const timestamp = Date.now();
      const organizerPhone = generateUniquePhone();
      const memberPhone = generateUniquePhone();

      let tripId: string;
      let organizerCookie: string;

      await test.step("setup: create users, trip, and seed notification", async () => {
        organizerCookie = await createUserViaAPI(
          request,
          organizerPhone,
          "Alice",
        );

        tripId = await createTripViaAPI(request, organizerCookie, {
          name: `Notif Bell Trip ${timestamp}`,
          destination: "Portland, OR",
          startDate: "2026-06-15",
          endDate: "2026-06-22",
        });

        const memberCookie = await createUserViaAPI(
          request,
          memberPhone,
          "Bob",
        );
        await inviteViaAPI(request, tripId, organizerCookie, [memberPhone]);
        await rsvpViaAPI(request, tripId, memberCookie, "going");

        // Organizer posts a message, which creates a notification for Bob
        const msgResponse = await request.post(
          `${API_BASE}/trips/${tripId}/messages`,
          {
            data: { content: "Hello from Alice!" },
            headers: { cookie: organizerCookie },
          },
        );
        expect(msgResponse.ok()).toBeTruthy();
      });

      await test.step("authenticate as member and navigate to trips", async () => {
        await authenticateViaAPIWithPhone(page, request, memberPhone, "Bob");
      });

      await test.step("verify global notification bell shows 1 unread", async () => {
        // The unread count endpoint may have already loaded during page init.
        // Reload to ensure a fresh fetch of unread count data.
        await page.reload();
        await page.waitForLoadState("domcontentloaded");

        const bell = page.getByRole("button", {
          name: /Notifications, 1 unread/,
        });
        await expect(bell).toBeVisible({ timeout: NAVIGATION_TIMEOUT });
      });

      await test.step("click bell and verify dropdown with notification", async () => {
        const bell = page.getByRole("button", {
          name: /Notifications, 1 unread/,
        });
        await bell.click();

        // Verify the dropdown heading
        await expect(
          page.getByRole("heading", { name: "Notifications" }),
        ).toBeVisible({ timeout: ELEMENT_TIMEOUT });

        // Verify the notification item shows "New message" title and "Alice:" in body
        await expect(page.getByText("New message")).toBeVisible();
        await expect(page.getByText(/Alice:.*Hello from Alice!/)).toBeVisible();
      });

      await snap(page, "50-notification-bell-dropdown");

      await test.step("click notification and verify navigation to trip discussion", async () => {
        // Click the notification item (it's a button containing the message text)
        const notificationItem = page
          .locator("button")
          .filter({ hasText: "New message" })
          .first();
        await notificationItem.click();

        // Wait for navigation to trip page with #discussion hash
        await page.waitForURL(`**/trips/${tripId}**`, { timeout: NAVIGATION_TIMEOUT });
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
          timeout: NAVIGATION_TIMEOUT,
        });
      });

      await test.step("verify notification was marked as read", async () => {
        // After clicking the notification, the optimistic update sets readAt
        // and decrements the unread count. The bell label updates immediately.
        // Wait for the bell to reflect zero unread (no count suffix).
        // Use exact: true to avoid matching "Trip notifications" bell on trip page.
        await expect(
          page.getByRole("button", { name: /^Notifications, \d+ unread$/ }),
        ).not.toBeVisible({ timeout: NAVIGATION_TIMEOUT });

        // Bell should now say "Notifications" without any unread count
        const bell = page.getByRole("button", {
          name: "Notifications",
          exact: true,
        });
        await expect(bell).toBeVisible({ timeout: ELEMENT_TIMEOUT });
      });

      await snap(page, "51-notification-after-click");
    },
  );

  test("mark all as read and trip notification bell journey", { tag: ["@regression", "@slow"] }, async ({
    page,
    request,
  }) => {
    test.slow(); // Multiple auth cycles and polling waits

    const timestamp = Date.now();
    const organizerPhone = generateUniquePhone();
    const memberPhone = generateUniquePhone();

    let tripId: string;
    let organizerCookie: string;

    await test.step("setup: create users, trip, and seed 2 notifications", async () => {
      organizerCookie = await createUserViaAPI(
        request,
        organizerPhone,
        "Alice",
      );

      tripId = await createTripViaAPI(request, organizerCookie, {
        name: `Notif Mark All Trip ${timestamp}`,
        destination: "Seattle, WA",
        startDate: "2026-07-01",
        endDate: "2026-07-08",
      });

      const memberCookie = await createUserViaAPI(
        request,
        memberPhone,
        "Bob",
      );
      await inviteViaAPI(request, tripId, organizerCookie, [memberPhone]);
      await rsvpViaAPI(request, tripId, memberCookie, "going");

      // Organizer posts 2 messages, each creating a notification for Bob
      const msg1Response = await request.post(
        `${API_BASE}/trips/${tripId}/messages`,
        {
          data: { content: "First message from Alice" },
          headers: { cookie: organizerCookie },
        },
      );
      expect(msg1Response.ok()).toBeTruthy();

      const msg2Response = await request.post(
        `${API_BASE}/trips/${tripId}/messages`,
        {
          data: { content: "Second message from Alice" },
          headers: { cookie: organizerCookie },
        },
      );
      expect(msg2Response.ok()).toBeTruthy();
    });

    await test.step("authenticate as member and navigate to trip", async () => {
      await authenticateViaAPIWithPhone(page, request, memberPhone, "Bob");
      await page.goto(`/trips/${tripId}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
        timeout: NAVIGATION_TIMEOUT,
      });
    });

    await test.step("verify per-trip notification bell shows 2 unread", async () => {
      const tripBell = page.getByRole("button", {
        name: /Trip notifications, 2 unread/,
      });
      await expect(tripBell).toBeVisible({ timeout: NAVIGATION_TIMEOUT });
    });

    await test.step("click trip bell and verify dialog with 2 notifications", async () => {
      const tripBell = page.getByRole("button", {
        name: /Trip notifications, 2 unread/,
      });
      await tripBell.click();

      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: "Notifications" }),
      ).toBeVisible({ timeout: ELEMENT_TIMEOUT });

      // Verify shows 2 items
      const notificationItems = dialog
        .locator("button")
        .filter({ hasText: "New message" });
      await expect(notificationItems).toHaveCount(2, { timeout: ELEMENT_TIMEOUT });
    });

    await snap(page, "52-trip-notification-dialog-2-unread");

    await test.step("click mark all as read", async () => {
      const dialog = page.getByRole("dialog");
      const markAllButton = dialog.getByRole("button", {
        name: "Mark all as read",
      });
      await expect(markAllButton).toBeVisible();
      await markAllButton.click();
    });

    await test.step("verify unread count disappears from trip bell", async () => {
      // Close the dialog first
      const dialog = page.getByRole("dialog");
      // Press Escape to close the dialog
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible({ timeout: DIALOG_TIMEOUT });

      // Trip bell should now say "Trip notifications" without count
      const tripBell = page.getByRole("button", {
        name: "Trip notifications",
        exact: true,
      });
      await expect(tripBell).toBeVisible({ timeout: ELEMENT_TIMEOUT });

      // Should NOT have unread count
      await expect(
        page.getByRole("button", {
          name: /Trip notifications, \d+ unread/,
        }),
      ).not.toBeVisible();
    });

    await snap(page, "53-trip-notification-all-read");

    await test.step("verify global bell also reflects zero unread", async () => {
      const globalBell = page.getByRole("button", {
        name: "Notifications",
        exact: true,
      });
      await expect(globalBell).toBeVisible({ timeout: ELEMENT_TIMEOUT });

      await expect(
        page.getByRole("button", {
          name: /Notifications, \d+ unread/,
        }),
      ).not.toBeVisible();
    });
  });

  test("notification preferences journey", { tag: ["@regression", "@slow"] }, async ({ page, request }) => {
    test.slow(); // Multiple auth cycles

    const timestamp = Date.now();
    const organizerPhone = generateUniquePhone();
    const memberPhone = generateUniquePhone();

    let tripId: string;

    await test.step("setup: create users, trip, invite and RSVP member", async () => {
      const organizerCookie = await createUserViaAPI(
        request,
        organizerPhone,
        "Alice",
      );

      tripId = await createTripViaAPI(request, organizerCookie, {
        name: `Notif Prefs Trip ${timestamp}`,
        destination: "Denver, CO",
        startDate: "2026-08-01",
        endDate: "2026-08-08",
      });

      const memberCookie = await createUserViaAPI(
        request,
        memberPhone,
        "Bob",
      );
      await inviteViaAPI(request, tripId, organizerCookie, [memberPhone]);
      await rsvpViaAPI(request, tripId, memberCookie, "going");
    });

    await test.step("authenticate as member and navigate to trip", async () => {
      await authenticateViaAPIWithPhone(page, request, memberPhone, "Bob");
      await page.goto(`/trips/${tripId}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
        timeout: NAVIGATION_TIMEOUT,
      });
    });

    await test.step("open trip settings dialog", async () => {
      const settingsButton = page.getByRole("button", {
        name: "Trip settings",
      });
      await expect(settingsButton).toBeVisible({ timeout: ELEMENT_TIMEOUT });
      await settingsButton.click();

      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: "Trip settings" }),
      ).toBeVisible({ timeout: ELEMENT_TIMEOUT });
    });

    await test.step("verify 2 preference switches are visible and checked", async () => {
      const dailyItinerarySwitch = page.getByRole("switch", {
        name: "Daily Itinerary",
      });
      const tripMessagesSwitch = page.getByRole("switch", {
        name: "Trip Messages",
      });

      await expect(dailyItinerarySwitch).toBeVisible({ timeout: ELEMENT_TIMEOUT });
      await expect(tripMessagesSwitch).toBeVisible();

      // All should be checked (default is true when RSVP "going")
      await expect(dailyItinerarySwitch).toHaveAttribute(
        "data-state",
        "checked",
      );
      await expect(tripMessagesSwitch).toHaveAttribute(
        "data-state",
        "checked",
      );
    });

    await snap(page, "54-notification-preferences-all-on");

    await test.step("toggle Trip Messages off", async () => {
      const tripMessagesSwitch = page.getByRole("switch", {
        name: "Trip Messages",
      });
      await tripMessagesSwitch.click();

      // Verify toast "Preferences updated" appears
      await expect(
        page.locator("[data-sonner-toast]").getByText("Preferences updated"),
      ).toBeVisible({ timeout: ELEMENT_TIMEOUT });
    });

    await test.step("dismiss toast and verify switch is unchecked", async () => {
      await dismissToast(page);

      const tripMessagesSwitch = page.getByRole("switch", {
        name: "Trip Messages",
      });
      await expect(tripMessagesSwitch).toHaveAttribute(
        "data-state",
        "unchecked",
      );
    });

    await snap(page, "55-notification-preferences-messages-off");

    await test.step("toggle Trip Messages back on", async () => {
      const tripMessagesSwitch = page.getByRole("switch", {
        name: "Trip Messages",
      });
      await tripMessagesSwitch.click();

      // Verify toast "Preferences updated" appears again
      await expect(
        page.locator("[data-sonner-toast]").getByText("Preferences updated"),
      ).toBeVisible({ timeout: ELEMENT_TIMEOUT });
    });

    await test.step("verify Trip Messages switch is checked again", async () => {
      const tripMessagesSwitch = page.getByRole("switch", {
        name: "Trip Messages",
      });
      await expect(tripMessagesSwitch).toHaveAttribute(
        "data-state",
        "checked",
      );
    });
  });
});
