import { test, expect } from "@playwright/test";
import { authenticateViaAPIWithPhone, createUserViaAPI } from "./helpers/auth";
import {
  createTripViaAPI,
  inviteViaAPI,
  rsvpViaAPI,
} from "./helpers/invitations";
import { removeNextjsDevOverlay } from "./helpers/nextjs-dev";
import { snap } from "./helpers/screenshots";

/**
 * E2E Journey: Messaging Flows
 *
 * Consolidates 10 messaging scenarios into 3 journey tests.
 * Uses direct API calls for fast setup and authenticateViaAPIWithPhone
 * to switch between users.
 */

const API_BASE = "http://localhost:8000/api";

/** Helper: dismiss any visible Sonner toast so it does not intercept clicks. */
async function dismissToast(page: import("@playwright/test").Page) {
  const toast = page.locator("[data-sonner-toast]").first();
  if (await toast.isVisible().catch(() => false)) {
    await toast.waitFor({ state: "hidden", timeout: 10000 });
  }
}

/** Helper: scroll to the discussion section and wait for it to be visible. */
async function scrollToDiscussion(page: import("@playwright/test").Page) {
  await page.locator("#discussion").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Discussion" })).toBeVisible({
    timeout: 10000,
  });
}

test.describe("Messaging Journey", () => {
  test.beforeEach(async ({ page }) => {
    await removeNextjsDevOverlay(page);
    await page.context().clearCookies();
  });

  test(
    "messaging CRUD journey",
    { tag: "@smoke" },
    async ({ page, request }) => {
      test.slow(); // Multiple auth cycles and polling waits

      const timestamp = Date.now();
      const shortTimestamp = timestamp.toString().slice(-10);
      const organizerPhone = `+1555${shortTimestamp}`;
      const memberPhone = `+1555${(parseInt(shortTimestamp) + 1000).toString()}`;

      let tripId: string;
      let organizerCookie: string;

      await test.step("setup: create organizer, trip, member", async () => {
        organizerCookie = await createUserViaAPI(
          request,
          organizerPhone,
          "Msg Organizer",
        );

        tripId = await createTripViaAPI(request, organizerCookie, {
          name: `Messaging Trip ${timestamp}`,
          destination: "Portland, OR",
          startDate: "2026-08-01",
          endDate: "2026-08-05",
        });

        const memberCookie = await createUserViaAPI(
          request,
          memberPhone,
          "Msg Member",
        );
        await inviteViaAPI(request, tripId, organizerCookie, [memberPhone]);
        await rsvpViaAPI(request, tripId, memberCookie, "going");
      });

      await test.step("navigate to trip and scroll to discussion", async () => {
        await authenticateViaAPIWithPhone(
          page,
          request,
          organizerPhone,
          "Msg Organizer",
        );
        await page.goto(`/trips/${tripId}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
          timeout: 15000,
        });
        await scrollToDiscussion(page);
      });

      await test.step("verify empty state", async () => {
        await expect(
          page.getByText("No messages yet. Start the conversation!"),
        ).toBeVisible();
      });

      await test.step("post a message and verify it appears", async () => {
        const input = page.getByPlaceholder("Write a message...");
        await input.fill("Hello from the organizer!");
        await page.getByRole("button", { name: "Send message" }).click();

        await expect(
          page.getByRole("feed").getByText("Hello from the organizer!"),
        ).toBeVisible({
          timeout: 10000,
        });
        // Empty state should be gone
        await expect(
          page.getByText("No messages yet. Start the conversation!"),
        ).not.toBeVisible();
        // Feed container should exist
        await expect(page.getByRole("feed")).toBeVisible();
      });

      await test.step("post a second message for edit/delete tests", async () => {
        const input = page.getByPlaceholder("Write a message...");
        await input.fill("This message will be edited then deleted");
        await page.getByRole("button", { name: "Send message" }).click();

        await expect(
          page.getByRole("feed").getByText("This message will be edited then deleted"),
        ).toBeVisible({ timeout: 10000 });
      });

      await snap(page, "40-messaging-two-messages");

      await test.step("react to the first message with heart", async () => {
        // The first message in the feed (newest first or oldest first depends on ordering)
        // Find the heart reaction button near the first message
        const firstMessageCard = page
          .getByRole("feed")
          .locator("div")
          .filter({ hasText: "Hello from the organizer!" })
          .first();

        const heartButton = firstMessageCard.getByRole("button", {
          name: "React with heart",
        });
        await heartButton.click();

        // Verify the reaction is active
        await expect(heartButton).toHaveAttribute("aria-pressed", "true", {
          timeout: 10000,
        });
        // Verify count shows "1"
        await expect(heartButton.locator("span").last()).toContainText("1");
      });

      await test.step("edit the second message", async () => {
        await dismissToast(page);

        // The feed renders newest-first, so the second-posted message appears FIRST
        const actionsButton = page.getByRole("button", {
          name: "Actions for message by Msg Organizer",
        });
        await actionsButton.first().click();

        await page.getByRole("menuitem", { name: "Edit" }).click();

        // The edit textarea should appear inside the feed (not the compose input)
        const editTextarea = page.getByRole("feed").getByRole("textbox");
        await expect(editTextarea).toBeVisible();

        await editTextarea.clear();
        await editTextarea.fill("This message has been edited");
        await page.getByRole("button", { name: "Save" }).click();

        // Verify "(edited)" indicator appears
        await expect(page.getByText("(edited)")).toBeVisible({
          timeout: 10000,
        });
        await expect(
          page.getByRole("feed").getByText("This message has been edited"),
        ).toBeVisible();
      });

      await test.step("delete the second message", async () => {
        await dismissToast(page);

        // The edited message is still first in the feed (newest-first)
        const actionsButton = page.getByRole("button", {
          name: "Actions for message by Msg Organizer",
        });
        await actionsButton.first().click();

        await page.getByRole("menuitem", { name: "Delete" }).click();

        // Confirm delete dialog
        await expect(
          page.getByRole("heading", { name: "Delete message?" }),
        ).toBeVisible();
        // Click the Delete button in the alert dialog (not the menu item)
        await page.getByRole("button", { name: "Delete" }).last().click();

        // Verify "This message was deleted" placeholder
        await expect(
          page.getByRole("feed").getByText("This message was deleted"),
        ).toBeVisible({
          timeout: 10000,
        });
        await expect(
          page.getByRole("feed").getByText("This message has been edited"),
        ).not.toBeVisible();
      });

      await test.step("reply to the first message", async () => {
        await dismissToast(page);

        // Find the Reply button for the first message
        const replyButton = page.getByRole("button", { name: "Reply" }).first();
        await replyButton.click();

        // The reply input should appear
        const replyInput = page.getByPlaceholder("Write a reply...");
        await expect(replyInput).toBeVisible();

        await replyInput.fill("This is a reply to the first message");
        // Find the send button within the reply area (icon button)
        const sendButtons = page.getByRole("button", { name: "Send message" });
        await sendButtons.last().click();

        // Verify the reply text appears
        await expect(
          page.getByRole("feed").getByText("This is a reply to the first message"),
        ).toBeVisible({ timeout: 10000 });
      });

      await snap(page, "41-messaging-after-crud");
    },
  );

  test("organizer actions journey", async ({ page, request }) => {
    test.slow(); // Multiple auth cycles

    const timestamp = Date.now();
    const shortTimestamp = timestamp.toString().slice(-10);
    const organizerPhone = `+1555${shortTimestamp}`;
    const memberPhone = `+1555${(parseInt(shortTimestamp) + 2000).toString()}`;

    let tripId: string;
    let organizerCookie: string;
    let memberCookie: string;

    await test.step("setup: create organizer, trip, member with message", async () => {
      organizerCookie = await createUserViaAPI(
        request,
        organizerPhone,
        "Org Admin",
      );

      tripId = await createTripViaAPI(request, organizerCookie, {
        name: `Organizer Actions Trip ${timestamp}`,
        destination: "Seattle, WA",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      });

      memberCookie = await createUserViaAPI(
        request,
        memberPhone,
        "Regular Member",
      );
      await inviteViaAPI(request, tripId, organizerCookie, [memberPhone]);
      await rsvpViaAPI(request, tripId, memberCookie, "going");

      // Member posts a message via API
      const msgResponse = await request.post(
        `${API_BASE}/trips/${tripId}/messages`,
        {
          data: { content: "Hello from the member!" },
          headers: { cookie: memberCookie },
        },
      );
      expect(msgResponse.ok()).toBeTruthy();
    });

    await test.step("organizer navigates to trip and sees member message", async () => {
      await authenticateViaAPIWithPhone(
        page,
        request,
        organizerPhone,
        "Org Admin",
      );
      await page.goto(`/trips/${tripId}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
        timeout: 15000,
      });
      await scrollToDiscussion(page);

      await expect(
        page.getByRole("feed").getByText("Hello from the member!"),
      ).toBeVisible({
        timeout: 10000,
      });
    });

    await test.step("pin the member message", async () => {
      await dismissToast(page);

      const actionsButton = page.getByRole("button", {
        name: "Actions for message by Regular Member",
      });
      await actionsButton.click();

      await page.getByRole("menuitem", { name: "Pin" }).click();

      // Verify pinned section appears
      await expect(page.getByText(/Pinned \(1\)/)).toBeVisible({
        timeout: 10000,
      });
    });

    await test.step("expand pinned section and verify content", async () => {
      // Click the pinned toggle to expand
      const pinnedToggle = page
        .locator("button[aria-expanded]")
        .filter({ hasText: /Pinned/ });
      await pinnedToggle.click();

      // Verify pinned message content is visible inside the section
      const pinnedSection = page.locator(".bg-primary\\/5");
      await expect(
        pinnedSection.getByText("Hello from the member!"),
      ).toBeVisible();
    });

    await snap(page, "42-messaging-pinned");

    await test.step("unpin the message", async () => {
      await dismissToast(page);

      const actionsButton = page.getByRole("button", {
        name: "Actions for message by Regular Member",
      });
      await actionsButton.click();

      await page.getByRole("menuitem", { name: "Unpin" }).click();

      // Verify pinned section disappears
      await expect(page.getByText(/Pinned \(\d+\)/)).not.toBeVisible({
        timeout: 10000,
      });
    });

    await test.step("organizer deletes the member message", async () => {
      await dismissToast(page);

      const actionsButton = page.getByRole("button", {
        name: "Actions for message by Regular Member",
      });
      await actionsButton.click();

      await page.getByRole("menuitem", { name: "Delete" }).click();

      // Confirm in dialog
      await expect(
        page.getByRole("heading", { name: "Delete message?" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Delete" }).last().click();

      // Verify deleted placeholder
      await expect(
        page.getByRole("feed").getByText("This message was deleted"),
      ).toBeVisible({
        timeout: 10000,
      });
      await expect(
        page.getByRole("feed").getByText("Hello from the member!"),
      ).not.toBeVisible();
    });

    await test.step("organizer mutes the member via members dialog", async () => {
      await dismissToast(page);

      // Open members dialog
      await page.getByText(/\d+ members?/).click();

      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: "Members" }),
      ).toBeVisible();

      // Find and click the actions button for the member
      await page
        .getByRole("button", { name: "Actions for Regular Member" })
        .click();
      await page.getByRole("menuitem", { name: "Mute" }).click();

      // Confirm mute in the dialog
      await expect(page.getByRole("heading", { name: /Mute/ })).toBeVisible();
      // Click the destructive "Mute" button in the alert dialog
      await page
        .getByRole("button", { name: "Mute", exact: true })
        .last()
        .click();

      // Verify toast
      await expect(page.getByText(/Regular Member has been muted/)).toBeVisible(
        { timeout: 10000 },
      );

      // Verify "Muted" badge appears in the dialog
      await expect(dialog.getByText("Muted")).toBeVisible({ timeout: 10000 });
    });

    await snap(page, "43-messaging-member-muted");
  });

  test("restricted states journey", async ({ page, request }) => {
    test.slow(); // Multiple auth cycles

    const timestamp = Date.now();
    const shortTimestamp = timestamp.toString().slice(-10);
    const organizerPhone = `+1555${shortTimestamp}`;
    const memberPhone = `+1555${(parseInt(shortTimestamp) + 3000).toString()}`;

    let tripId: string;
    let organizerCookie: string;

    await test.step("setup: create trip with muted member", async () => {
      organizerCookie = await createUserViaAPI(
        request,
        organizerPhone,
        "Restrict Org",
      );

      tripId = await createTripViaAPI(request, organizerCookie, {
        name: `Restricted Trip ${timestamp}`,
        destination: "Denver, CO",
        startDate: "2026-07-01",
        endDate: "2026-07-05",
      });

      const memberCookie = await createUserViaAPI(
        request,
        memberPhone,
        "Muted Person",
      );
      await inviteViaAPI(request, tripId, organizerCookie, [memberPhone]);
      await rsvpViaAPI(request, tripId, memberCookie, "going");

      // Get the member's userId from the members list
      const membersResponse = await request.get(
        `${API_BASE}/trips/${tripId}/members`,
        { headers: { cookie: organizerCookie } },
      );
      expect(membersResponse.ok()).toBeTruthy();
      const membersData = await membersResponse.json();
      const memberUserId = membersData.members.find(
        (m: { displayName: string }) => m.displayName === "Muted Person",
      )?.userId;
      expect(memberUserId).toBeTruthy();

      // Mute the member via API
      const muteResponse = await request.post(
        `${API_BASE}/trips/${tripId}/members/${memberUserId}/mute`,
        { headers: { cookie: organizerCookie } },
      );
      expect(muteResponse.ok()).toBeTruthy();
    });

    await test.step("muted member tries to send a message and gets error", async () => {
      await authenticateViaAPIWithPhone(
        page,
        request,
        memberPhone,
        "Muted Person",
      );
      await page.goto(`/trips/${tripId}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
        timeout: 15000,
      });
      await scrollToDiscussion(page);

      // The input should be visible (isMuted is not wired from parent)
      const input = page.getByPlaceholder("Write a message...");
      await expect(input).toBeVisible();

      // Try to send a message
      await input.fill("I am muted but trying to send");
      await page.getByRole("button", { name: "Send message" }).click();

      // Should see an error toast about being muted
      await expect(
        page.locator("[data-sonner-toast]").getByText(/muted/i),
      ).toBeVisible({ timeout: 10000 });
    });

    await snap(page, "44-messaging-muted-error");

    // --- Past trip read-only test ---

    let pastTripId: string;
    const pastOrgPhone = `+1555${(parseInt(shortTimestamp) + 4000).toString()}`;

    await test.step("setup: create a trip, post a message, then set it to past dates", async () => {
      const pastOrgCookie = await createUserViaAPI(
        request,
        pastOrgPhone,
        "Past Trip Org",
      );

      // Create trip with future dates so we can post a message
      pastTripId = await createTripViaAPI(request, pastOrgCookie, {
        name: `Past Messaging Trip ${timestamp}`,
        destination: "Historic Town",
        startDate: "2026-12-01",
        endDate: "2026-12-05",
      });

      // Post a message while the trip is still active
      const msgResponse = await request.post(
        `${API_BASE}/trips/${pastTripId}/messages`,
        {
          data: { content: "Old message from the past" },
          headers: { cookie: pastOrgCookie },
        },
      );
      expect(msgResponse.ok()).toBeTruthy();

      // Now update the trip dates to the past so it becomes read-only
      const updateResponse = await request.put(
        `${API_BASE}/trips/${pastTripId}`,
        {
          data: { startDate: "2025-01-01", endDate: "2025-01-05" },
          headers: { cookie: pastOrgCookie },
        },
      );
      expect(updateResponse.ok()).toBeTruthy();
    });

    await test.step("navigate to past trip and verify read-only discussion", async () => {
      await page.context().clearCookies();
      await authenticateViaAPIWithPhone(
        page,
        request,
        pastOrgPhone,
        "Past Trip Org",
      );
      await page.goto(`/trips/${pastTripId}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
        timeout: 15000,
      });
      await scrollToDiscussion(page);

      // Verify "Trip has ended" disabled message instead of input (scoped to discussion section)
      const discussion = page.locator("#discussion");
      await expect(discussion.getByText("Trip has ended")).toBeVisible({
        timeout: 10000,
      });
      // The text input should NOT be visible (disabled state renders message instead)
      await expect(
        page.getByPlaceholder("Write a message..."),
      ).not.toBeVisible();
    });

    await test.step("verify past trip message is visible but no actions", async () => {
      // The old message should be visible
      await expect(
        page.getByRole("feed").getByText("Old message from the past"),
      ).toBeVisible({
        timeout: 10000,
      });

      // No action buttons should be present (disabled=true removes them)
      await expect(
        page.getByRole("button", { name: /Actions for message by/ }),
      ).not.toBeVisible();

      // Reply button should not be visible on past trips
      await expect(
        page.getByRole("button", { name: "Reply" }),
      ).not.toBeVisible();
    });

    await snap(page, "45-messaging-past-trip-readonly");
  });
});
