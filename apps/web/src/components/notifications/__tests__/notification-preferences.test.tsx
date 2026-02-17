import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mocks
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({
  toast: mockToast,
}));

const mockUseNotificationPreferences = vi.fn();
const mockUpdatePreferencesMutate = vi.fn();

vi.mock("@/hooks/use-notifications", () => ({
  useNotificationPreferences: (tripId: string) =>
    mockUseNotificationPreferences(tripId),
  useUpdateNotificationPreferences: () => ({
    mutate: mockUpdatePreferencesMutate,
    isPending: false,
  }),
  getUpdatePreferencesErrorMessage: (error: Error | null) => {
    if (!error) return null;
    return error.message || "Failed to update preferences";
  },
}));

import { NotificationPreferences } from "../notification-preferences";

describe("NotificationPreferences", () => {
  const defaultPrefs = {
    eventReminders: true,
    dailyItinerary: true,
    tripMessages: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotificationPreferences.mockReturnValue({
      data: defaultPrefs,
      isLoading: false,
    });
  });

  it("renders three preference toggles", () => {
    render(<NotificationPreferences tripId="trip-1" />);

    expect(screen.getByText("Event Reminders")).toBeDefined();
    expect(screen.getByText("Daily Itinerary")).toBeDefined();
    expect(screen.getByText("Trip Messages")).toBeDefined();
  });

  it("renders preference descriptions", () => {
    render(<NotificationPreferences tripId="trip-1" />);

    expect(
      screen.getByText("Get notified 1 hour before each event"),
    ).toBeDefined();
    expect(
      screen.getByText("Receive a summary of the day's events at 8am"),
    ).toBeDefined();
    expect(
      screen.getByText("Get notified when someone posts a new message"),
    ).toBeDefined();
  });

  it("renders SMS footer note", () => {
    render(<NotificationPreferences tripId="trip-1" />);

    expect(
      screen.getByText(
        "Notifications are sent in-app and via SMS to your phone number.",
      ),
    ).toBeDefined();
  });

  it("shows loading skeletons when loading", () => {
    mockUseNotificationPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(
      <NotificationPreferences tripId="trip-1" />,
    );

    // Should show skeleton elements, not the preference labels
    expect(screen.queryByText("Event Reminders")).toBeNull();

    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("passes tripId to useNotificationPreferences", () => {
    render(<NotificationPreferences tripId="trip-abc" />);
    expect(mockUseNotificationPreferences).toHaveBeenCalledWith("trip-abc");
  });

  it("renders switches with correct checked state", () => {
    mockUseNotificationPreferences.mockReturnValue({
      data: {
        eventReminders: true,
        dailyItinerary: false,
        tripMessages: true,
      },
      isLoading: false,
    });

    render(<NotificationPreferences tripId="trip-1" />);

    const eventSwitch = screen.getByRole("switch", {
      name: "Event Reminders",
    });
    const dailySwitch = screen.getByRole("switch", {
      name: "Daily Itinerary",
    });
    const messagesSwitch = screen.getByRole("switch", {
      name: "Trip Messages",
    });

    expect(eventSwitch.getAttribute("data-state")).toBe("checked");
    expect(dailySwitch.getAttribute("data-state")).toBe("unchecked");
    expect(messagesSwitch.getAttribute("data-state")).toBe("checked");
  });

  it("calls updatePreferences with all fields when toggling eventReminders", async () => {
    const user = userEvent.setup();

    render(<NotificationPreferences tripId="trip-1" />);

    const eventSwitch = screen.getByRole("switch", {
      name: "Event Reminders",
    });
    await user.click(eventSwitch);

    expect(mockUpdatePreferencesMutate).toHaveBeenCalledWith(
      {
        eventReminders: false,
        dailyItinerary: true,
        tripMessages: true,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("calls updatePreferences with all fields when toggling dailyItinerary", async () => {
    const user = userEvent.setup();

    render(<NotificationPreferences tripId="trip-1" />);

    const dailySwitch = screen.getByRole("switch", {
      name: "Daily Itinerary",
    });
    await user.click(dailySwitch);

    expect(mockUpdatePreferencesMutate).toHaveBeenCalledWith(
      {
        eventReminders: true,
        dailyItinerary: false,
        tripMessages: true,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("calls updatePreferences with all fields when toggling tripMessages", async () => {
    const user = userEvent.setup();

    render(<NotificationPreferences tripId="trip-1" />);

    const messagesSwitch = screen.getByRole("switch", {
      name: "Trip Messages",
    });
    await user.click(messagesSwitch);

    expect(mockUpdatePreferencesMutate).toHaveBeenCalledWith(
      {
        eventReminders: true,
        dailyItinerary: true,
        tripMessages: false,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("shows success toast when mutation succeeds", async () => {
    const user = userEvent.setup();
    mockUpdatePreferencesMutate.mockImplementation(
      (
        _data: unknown,
        options: { onSuccess: () => void; onError: (error: Error) => void },
      ) => {
        options.onSuccess();
      },
    );

    render(<NotificationPreferences tripId="trip-1" />);

    const eventSwitch = screen.getByRole("switch", {
      name: "Event Reminders",
    });
    await user.click(eventSwitch);

    expect(mockToast.success).toHaveBeenCalledWith("Preferences updated");
  });

  it("shows toast error when mutation fails", async () => {
    const user = userEvent.setup();
    mockUpdatePreferencesMutate.mockImplementation(
      (_data: unknown, options: { onError: (error: Error) => void }) => {
        options.onError(new Error("Server error"));
      },
    );

    render(<NotificationPreferences tripId="trip-1" />);

    const eventSwitch = screen.getByRole("switch", {
      name: "Event Reminders",
    });
    await user.click(eventSwitch);

    expect(mockToast.error).toHaveBeenCalledWith("Server error");
  });
});
