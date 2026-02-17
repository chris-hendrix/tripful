import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Notification, NotificationType } from "@tripful/shared/types";

// Mocks
const mockPush = vi.fn();
const mockUseTripUnreadCount = vi.fn();
const mockUseNotifications = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockUseNotificationPreferences = vi.fn();
const mockUpdatePreferencesMutate = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/use-notifications", () => ({
  useTripUnreadCount: (tripId: string) => mockUseTripUnreadCount(tripId),
  useNotifications: (options?: Record<string, unknown>) =>
    mockUseNotifications(options),
  useMarkAsRead: () => ({ mutate: mockMarkAsRead, isPending: false }),
  useMarkAllAsRead: () => ({ mutate: mockMarkAllAsRead, isPending: false }),
  useNotificationPreferences: (tripId: string) =>
    mockUseNotificationPreferences(tripId),
  useUpdateNotificationPreferences: () => ({
    mutate: mockUpdatePreferencesMutate,
    isPending: false,
  }),
  getUpdatePreferencesErrorMessage: () => null,
}));

import { TripNotificationBell } from "../trip-notification-bell";

function makeNotification(
  overrides: Partial<Notification> = {},
): Notification {
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

describe("TripNotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTripUnreadCount.mockReturnValue({ data: 0, isLoading: false });
    mockUseNotifications.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    mockUseNotificationPreferences.mockReturnValue({
      data: { eventReminders: true, dailyItinerary: true, tripMessages: true },
      isLoading: false,
    });
  });

  it("renders bell icon button with aria-label 'Trip notifications'", () => {
    render(<TripNotificationBell tripId="trip-1" />);

    const button = screen.getByRole("button", { name: "Trip notifications" });
    expect(button).toBeDefined();
  });

  it("shows badge with unread count when count > 0", () => {
    mockUseTripUnreadCount.mockReturnValue({ data: 5, isLoading: false });
    render(<TripNotificationBell tripId="trip-1" />);

    expect(screen.getByText("5")).toBeDefined();
  });

  it("hides badge when unread count is 0", () => {
    mockUseTripUnreadCount.mockReturnValue({ data: 0, isLoading: false });
    render(<TripNotificationBell tripId="trip-1" />);

    const button = screen.getByRole("button", {
      name: "Trip notifications",
    });
    const badge = button.querySelector(".bg-destructive");
    expect(badge).toBeNull();
  });

  it("hides badge when unread count is undefined", () => {
    mockUseTripUnreadCount.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    render(<TripNotificationBell tripId="trip-1" />);

    const button = screen.getByRole("button", {
      name: "Trip notifications",
    });
    const badge = button.querySelector(".bg-destructive");
    expect(badge).toBeNull();
  });

  it('shows "9+" when count > 9', () => {
    mockUseTripUnreadCount.mockReturnValue({ data: 15, isLoading: false });
    render(<TripNotificationBell tripId="trip-1" />);

    expect(screen.getByText("9+")).toBeDefined();
  });

  it("shows correct aria-label with unread count", () => {
    mockUseTripUnreadCount.mockReturnValue({ data: 3, isLoading: false });
    render(<TripNotificationBell tripId="trip-1" />);

    const button = screen.getByRole("button", {
      name: "Trip notifications, 3 unread",
    });
    expect(button).toBeDefined();
  });

  it("passes tripId to useTripUnreadCount", () => {
    render(<TripNotificationBell tripId="trip-abc" />);
    expect(mockUseTripUnreadCount).toHaveBeenCalledWith("trip-abc");
  });

  it("opens dialog when bell is clicked", async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification()],
        unreadCount: 1,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<TripNotificationBell tripId="trip-1" />);

    const button = screen.getByRole("button", {
      name: "Trip notifications",
    });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Trip notifications")).toBeDefined();
      expect(screen.getByRole("tab", { name: "Notifications" })).toBeDefined();
      expect(screen.getByRole("tab", { name: "Preferences" })).toBeDefined();
    });
  });

  it("shows notification items in dialog", async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [
          makeNotification({ title: "New Event", body: "Pool party" }),
          makeNotification({
            id: "notif-2",
            title: "Dates Changed",
            body: "Trip moved",
          }),
        ],
        unreadCount: 2,
        meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<TripNotificationBell tripId="trip-1" />);

    const button = screen.getByRole("button", {
      name: "Trip notifications",
    });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("New Event")).toBeDefined();
      expect(screen.getByText("Pool party")).toBeDefined();
      expect(screen.getByText("Dates Changed")).toBeDefined();
      expect(screen.getByText("Trip moved")).toBeDefined();
    });
  });

  it("shows empty state when no notifications", async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [],
        unreadCount: 0,
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      },
      isLoading: false,
    });

    render(<TripNotificationBell tripId="trip-1" />);

    const button = screen.getByRole("button", {
      name: "Trip notifications",
    });
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("No notifications for this trip"),
      ).toBeDefined();
    });
  });

  it("calls markAllAsRead with tripId when clicking mark all as read", async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [makeNotification({ readAt: null })],
        unreadCount: 1,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<TripNotificationBell tripId="trip-1" />);

    const bellButton = screen.getByRole("button", {
      name: "Trip notifications",
    });
    await user.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Mark all as read")).toBeDefined();
    });

    await user.click(screen.getByText("Mark all as read"));
    expect(mockMarkAllAsRead).toHaveBeenCalledWith({ tripId: "trip-1" });
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
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<TripNotificationBell tripId="trip-xyz" />);

    const bellButton = screen.getByRole("button", {
      name: "Trip notifications",
    });
    await user.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Trip Updated")).toBeDefined();
    });

    await user.click(screen.getByText("Trip Updated"));

    expect(mockMarkAsRead).toHaveBeenCalledWith("notif-abc");
    expect(mockPush).toHaveBeenCalledWith("/trips/trip-xyz");
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
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<TripNotificationBell tripId="trip-abc" />);

    const bellButton = screen.getByRole("button", {
      name: "Trip notifications",
    });
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
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<TripNotificationBell tripId="trip-xyz" />);

    const bellButton = screen.getByRole("button", {
      name: "Trip notifications",
    });
    await user.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Trip Updated")).toBeDefined();
    });

    await user.click(screen.getByText("Trip Updated"));

    expect(mockMarkAsRead).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/trips/trip-xyz");
  });

  it('does not show "Mark all as read" when all are read', async () => {
    const user = userEvent.setup();
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [
          makeNotification({ readAt: "2026-01-01T00:00:00Z" }),
        ],
        unreadCount: 0,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<TripNotificationBell tripId="trip-1" />);

    const bellButton = screen.getByRole("button", {
      name: "Trip notifications",
    });
    await user.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Trip Updated")).toBeDefined();
    });

    expect(screen.queryByText("Mark all as read")).toBeNull();
  });
});
