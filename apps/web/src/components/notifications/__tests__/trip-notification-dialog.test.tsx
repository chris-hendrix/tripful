import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Notification, NotificationType } from "@tripful/shared/types";

// Mocks
const mockPush = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockUseNotifications = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/use-notifications", () => ({
  useNotifications: (options?: Record<string, unknown>) =>
    mockUseNotifications(options),
  useMarkAsRead: () => ({ mutate: mockMarkAsRead, isPending: false }),
  useMarkAllAsRead: () => ({ mutate: mockMarkAllAsRead, isPending: false }),
}));

import { TripNotificationDialog } from "../trip-notification-dialog";

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif-1",
    userId: "user-1",
    tripId: "trip-1",
    type: "trip_update" as NotificationType,
    title: "Trip Updated",
    body: "Your trip has been updated.",
    data: null,
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("TripNotificationDialog", () => {
  const defaultProps = {
    tripId: "trip-1",
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it("renders dialog with title", () => {
    render(<TripNotificationDialog {...defaultProps} />);

    expect(screen.getByText("Notifications")).toBeDefined();
  });

  it("shows empty state when no notifications", () => {
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [],
        unreadCount: 0,
        meta: { total: 0, limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    expect(screen.getByText("No notifications for this trip")).toBeDefined();
  });

  it("shows loading state and hides notification content", () => {
    mockUseNotifications.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    // When loading, should not show empty state or notification items
    expect(screen.queryByText("No notifications for this trip")).toBeNull();
    expect(screen.queryByText("Mark all as read")).toBeNull();

    // Dialog title should still be visible
    expect(screen.getByText("Notifications")).toBeDefined();
  });

  it("shows notifications list", () => {
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [
          makeNotification({ title: "Event Added", body: "Beach party" }),
          makeNotification({
            id: "notif-2",
            title: "Trip Updated",
            body: "Dates changed",
          }),
        ],
        unreadCount: 2,
        meta: { total: 2, limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    expect(screen.getByText("Event Added")).toBeDefined();
    expect(screen.getByText("Beach party")).toBeDefined();
    expect(screen.getByText("Trip Updated")).toBeDefined();
    expect(screen.getByText("Dates changed")).toBeDefined();
  });

  it('shows "Mark all as read" when there are unread notifications', () => {
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification({ readAt: null })],
        unreadCount: 1,
        meta: { total: 1, limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    expect(screen.getByText("Mark all as read")).toBeDefined();
  });

  it('hides "Mark all as read" when all are read', () => {
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification({ readAt: "2026-01-01T00:00:00Z" })],
        unreadCount: 0,
        meta: { total: 1, limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    expect(screen.queryByText("Mark all as read")).toBeNull();
  });

  it("calls markAllAsRead with tripId", async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification({ readAt: null })],
        unreadCount: 1,
        meta: { total: 1, limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    await user.click(screen.getByText("Mark all as read"));
    expect(mockMarkAllAsRead).toHaveBeenCalledWith({ tripId: "trip-1" });
  });

  it("calls markAsRead and navigates on notification click", async () => {
    const user = userEvent.setup();
    const notification = makeNotification({
      id: "notif-abc",
      tripId: "trip-1",
      readAt: null,
    });

    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [notification],
        unreadCount: 1,
        meta: { total: 1, limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    await user.click(screen.getByText("Trip Updated"));

    expect(mockMarkAsRead).toHaveBeenCalledWith("notif-abc");
    expect(mockPush).toHaveBeenCalledWith("/trips/trip-1");
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("navigates to discussion hash for trip_message type", async () => {
    const user = userEvent.setup();
    const notification = makeNotification({
      id: "notif-msg",
      tripId: "trip-1",
      type: "trip_message",
      data: { messageId: "msg-1" },
      readAt: null,
    });

    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [notification],
        unreadCount: 1,
        meta: { total: 1, limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    await user.click(screen.getByText("Trip Updated"));

    expect(mockPush).toHaveBeenCalledWith("/trips/trip-1#discussion");
  });

  it("does not call markAsRead for already-read notifications", async () => {
    const user = userEvent.setup();
    const notification = makeNotification({
      readAt: "2026-01-01T00:00:00Z",
      tripId: "trip-1",
    });

    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [notification],
        unreadCount: 0,
        meta: { total: 1, limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    await user.click(screen.getByText("Trip Updated"));

    expect(mockMarkAsRead).not.toHaveBeenCalled();
  });

  it("closes dialog on notification click", async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification({ tripId: "trip-1" })],
        unreadCount: 1,
        meta: { total: 1, limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    await user.click(screen.getByText("Trip Updated"));

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render content when dialog is closed", () => {
    render(
      <TripNotificationDialog
        tripId="trip-1"
        open={false}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.queryByText("Notifications")).toBeNull();
  });

  it('shows "Load more" button when there are more notifications', () => {
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification()],
        unreadCount: 1,
        meta: { total: 25, limit: 20, hasMore: true, nextCursor: "some-cursor" },
      },
      isLoading: false,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    expect(screen.getByText("Load more")).toBeDefined();
  });

  it('does not show "Load more" when all notifications are loaded', () => {
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification()],
        unreadCount: 1,
        meta: { total: 1, limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    expect(screen.queryByText("Load more")).toBeNull();
  });

  it("requests more notifications when Load more is clicked", async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification()],
        unreadCount: 1,
        meta: { total: 25, limit: 20, hasMore: true, nextCursor: "some-cursor" },
      },
      isLoading: false,
    });

    render(<TripNotificationDialog {...defaultProps} />);

    await user.click(screen.getByText("Load more"));

    // After clicking Load more, the hook should be called with increased limit
    await waitFor(() => {
      const lastCall =
        mockUseNotifications.mock.calls[
          mockUseNotifications.mock.calls.length - 1
        ];
      expect(lastCall[0]).toEqual(
        expect.objectContaining({ tripId: "trip-1", limit: 40 }),
      );
    });
  });
});
