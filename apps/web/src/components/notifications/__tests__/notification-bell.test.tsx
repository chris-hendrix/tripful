import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Notification } from "@tripful/shared/types";

// Mocks
const mockPush = vi.fn();
const mockPathname = vi.fn().mockReturnValue("/trips");
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockUseUnreadCount = vi.fn();
const mockUseNotifications = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

vi.mock("@/hooks/use-notifications", () => ({
  useUnreadCount: () => mockUseUnreadCount(),
  useNotifications: () => mockUseNotifications(),
  useMarkAsRead: () => ({ mutate: mockMarkAsRead, isPending: false }),
  useMarkAllAsRead: () => ({ mutate: mockMarkAllAsRead, isPending: false }),
}));

import { NotificationBell } from "../notification-bell";

function makeNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: "notif-1",
    userId: "user-1",
    tripId: "trip-1",
    type: "trip_update",
    title: "Trip Updated",
    body: "Your trip has been updated with new details.",
    data: null,
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUnreadCount.mockReturnValue({ data: 0, isLoading: false });
    mockUseNotifications.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it("renders bell icon button with aria-label 'Notifications'", () => {
    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    expect(button).toBeDefined();
  });

  it("shows badge with unread count when count > 0", () => {
    mockUseUnreadCount.mockReturnValue({ data: 3, isLoading: false });
    render(<NotificationBell />);

    expect(screen.getByText("3")).toBeDefined();
  });

  it("re-triggers badge pulse animation when count changes", () => {
    mockUseUnreadCount.mockReturnValue({ data: 3, isLoading: false });
    const { rerender } = render(<NotificationBell />);

    const badge = screen.getByText("3");
    expect(badge.className).toContain("motion-safe:animate-[badgePulse_600ms_ease-in-out]");

    // Change the unread count
    mockUseUnreadCount.mockReturnValue({ data: 5, isLoading: false });
    rerender(<NotificationBell />);

    const updatedBadge = screen.getByText("5");
    expect(updatedBadge.className).toContain("motion-safe:animate-[badgePulse_600ms_ease-in-out]");
  });

  it("hides badge when unread count is 0", () => {
    mockUseUnreadCount.mockReturnValue({ data: 0, isLoading: false });
    render(<NotificationBell />);

    expect(screen.queryByText("0")).toBeNull();
  });

  it("hides badge when unread count is undefined", () => {
    mockUseUnreadCount.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    render(<NotificationBell />);

    // No badge element should be rendered
    const button = screen.getByRole("button", { name: "Notifications" });
    const badge = button.querySelector(
      ".bg-destructive",
    );
    expect(badge).toBeNull();
  });

  it('shows "9+" when count > 9', () => {
    mockUseUnreadCount.mockReturnValue({ data: 15, isLoading: false });
    render(<NotificationBell />);

    expect(screen.getByText("9+")).toBeDefined();
  });

  it("opens popover when bell is clicked", async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification()],
        unreadCount: 1,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeDefined();
    });
  });

  it("shows notification items in popover", async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [
          makeNotification({ title: "New Event", body: "Beach party added" }),
          makeNotification({
            id: "notif-2",
            title: "Trip Updated",
            body: "Dates changed",
          }),
        ],
        unreadCount: 2,
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("New Event")).toBeDefined();
      expect(screen.getByText("Beach party added")).toBeDefined();
      expect(screen.getByText("Trip Updated")).toBeDefined();
      expect(screen.getByText("Dates changed")).toBeDefined();
    });
  });

  it('shows "Mark all as read" button when there are unread notifications', async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification({ readAt: null })],
        unreadCount: 1,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Mark all as read")).toBeDefined();
    });
  });

  it('calls markAllAsRead when "Mark all as read" is clicked', async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification({ readAt: null })],
        unreadCount: 1,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const bellButton = screen.getByRole("button", { name: "Notifications" });
    await user.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Mark all as read")).toBeDefined();
    });

    const markAllButton = screen.getByText("Mark all as read");
    await user.click(markAllButton);

    expect(mockMarkAllAsRead).toHaveBeenCalledWith(undefined);
  });

  it("shows empty state when no notifications", async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [],
        unreadCount: 0,
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("No notifications yet")).toBeDefined();
    });
  });

  it("calls markAsRead and navigates on notification click", async () => {
    const user = userEvent.setup();
    const notification = makeNotification({
      id: "notif-abc",
      tripId: "trip-xyz",
      readAt: null,
    });

    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [notification],
        unreadCount: 1,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const bellButton = screen.getByRole("button", { name: "Notifications" });
    await user.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Trip Updated")).toBeDefined();
    });

    await user.click(screen.getByText("Trip Updated"));

    expect(mockMarkAsRead).toHaveBeenCalledWith("notif-abc");
    expect(mockPush).toHaveBeenCalledWith("/trips/trip-xyz");
  });

  it("correct aria-label with unread count", () => {
    mockUseUnreadCount.mockReturnValue({ data: 3, isLoading: false });
    render(<NotificationBell />);

    const button = screen.getByRole("button", {
      name: "Notifications, 3 unread",
    });
    expect(button).toBeDefined();
  });

  it("navigates to discussion hash for trip_message notifications", async () => {
    const user = userEvent.setup();
    const notification = makeNotification({
      id: "notif-msg",
      tripId: "trip-abc",
      type: "trip_message",
      data: { messageId: "msg-123" },
      readAt: null,
    });

    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [notification],
        unreadCount: 1,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const bellButton = screen.getByRole("button", { name: "Notifications" });
    await user.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Trip Updated")).toBeDefined();
    });

    await user.click(screen.getByText("Trip Updated"));

    expect(mockPush).toHaveBeenCalledWith("/trips/trip-abc#discussion");
  });

  it("does not call markAsRead for already-read notifications", async () => {
    const user = userEvent.setup();
    const notification = makeNotification({
      id: "notif-read",
      tripId: "trip-xyz",
      readAt: "2026-01-01T00:00:00Z",
    });

    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [notification],
        unreadCount: 0,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const bellButton = screen.getByRole("button", { name: "Notifications" });
    await user.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Trip Updated")).toBeDefined();
    });

    await user.click(screen.getByText("Trip Updated"));

    expect(mockMarkAsRead).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/trips/trip-xyz");
  });

  it('does not show "Mark all as read" when all notifications are read', async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [
          makeNotification({ readAt: "2026-01-01T00:00:00Z" }),
        ],
        unreadCount: 0,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeDefined();
    });

    expect(screen.queryByText("Mark all as read")).toBeNull();
  });

  it('shows "View all notifications" when total > displayed count', async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification()],
        unreadCount: 1,
        meta: { total: 15, page: 1, limit: 10, totalPages: 2 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("View all notifications")).toBeDefined();
    });
  });

  it('does not show "View all notifications" when total <= displayed count', async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification()],
        unreadCount: 1,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeDefined();
    });

    expect(screen.queryByText("View all notifications")).toBeNull();
  });

  it('does not show "View all notifications" in empty state', async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [],
        unreadCount: 0,
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("No notifications yet")).toBeDefined();
    });

    expect(screen.queryByText("View all notifications")).toBeNull();
  });

  it('"View all notifications" navigates to /trips and closes dropdown when not on trip page', async () => {
    const user = userEvent.setup();
    mockPathname.mockReturnValue("/trips");
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification()],
        unreadCount: 1,
        meta: { total: 15, page: 1, limit: 10, totalPages: 2 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const bellButton = screen.getByRole("button", { name: "Notifications" });
    await user.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("View all notifications")).toBeDefined();
    });

    await user.click(screen.getByText("View all notifications"));

    expect(mockPush).toHaveBeenCalledWith("/trips");
  });

  it('"View all notifications" navigates to trip page and closes dropdown when on a trip page', async () => {
    const user = userEvent.setup();
    mockPathname.mockReturnValue("/trips/trip-abc");
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification()],
        unreadCount: 1,
        meta: { total: 15, page: 1, limit: 10, totalPages: 2 },
      },
      isLoading: false,
    });

    render(<NotificationBell />);

    const bellButton = screen.getByRole("button", { name: "Notifications" });
    await user.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("View all notifications")).toBeDefined();
    });

    await user.click(screen.getByText("View all notifications"));

    expect(mockPush).toHaveBeenCalledWith("/trips/trip-abc");
  });
});
