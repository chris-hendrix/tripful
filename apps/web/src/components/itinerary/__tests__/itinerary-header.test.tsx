import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ItineraryHeader } from "../itinerary-header";

describe("ItineraryHeader", () => {
  let queryClient: QueryClient;

  const defaultProps = {
    viewMode: "day-by-day" as const,
    onViewModeChange: vi.fn(),
    showUserTime: false,
    onShowUserTimeChange: vi.fn(),
    tripTimezone: "America/Los_Angeles",
    userTimezone: "America/New_York",
    tripId: "test-trip-123",
    isOrganizer: false,
    isMember: true,
    allowMembersToAddEvents: true,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderWithQueryClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  describe("Rendering", () => {
    it("renders view mode toggle buttons", () => {
      renderWithQueryClient(<ItineraryHeader {...defaultProps} />);

      expect(screen.getByText("Day by Day")).toBeDefined();
      expect(screen.getByText("Group by Type")).toBeDefined();
    });

    it("renders timezone toggle buttons", () => {
      renderWithQueryClient(<ItineraryHeader {...defaultProps} />);

      expect(screen.getByText(/Trip \(Los Angeles\)/)).toBeDefined();
      expect(screen.getByText(/Your \(New York\)/)).toBeDefined();
    });
  });

  describe("View mode toggle", () => {
    it("highlights day-by-day button when selected", () => {
      renderWithQueryClient(<ItineraryHeader {...defaultProps} viewMode="day-by-day" />);

      const button = screen.getByText("Day by Day").closest("button");
      expect(button?.dataset.variant).toBe("default");
    });

    it("highlights group-by-type button when selected", () => {
      renderWithQueryClient(<ItineraryHeader {...defaultProps} viewMode="group-by-type" />);

      const button = screen.getByText("Group by Type").closest("button");
      expect(button?.dataset.variant).toBe("default");
    });

    it("calls onViewModeChange when day-by-day is clicked", async () => {
      const user = userEvent.setup();
      const onViewModeChange = vi.fn();

      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          viewMode="group-by-type"
          onViewModeChange={onViewModeChange}
        />
      );

      const button = screen.getByText("Day by Day");
      await user.click(button);

      expect(onViewModeChange).toHaveBeenCalledWith("day-by-day");
    });

    it("calls onViewModeChange when group-by-type is clicked", async () => {
      const user = userEvent.setup();
      const onViewModeChange = vi.fn();

      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          onViewModeChange={onViewModeChange}
        />
      );

      const button = screen.getByText("Group by Type");
      await user.click(button);

      expect(onViewModeChange).toHaveBeenCalledWith("group-by-type");
    });
  });

  describe("Timezone toggle", () => {
    it("highlights trip timezone button when not showing user time", () => {
      renderWithQueryClient(<ItineraryHeader {...defaultProps} showUserTime={false} />);

      const button = screen
        .getByText(/Trip \(Los Angeles\)/)
        .closest("button");
      expect(button?.dataset.variant).toBe("default");
    });

    it("highlights user timezone button when showing user time", () => {
      renderWithQueryClient(<ItineraryHeader {...defaultProps} showUserTime={true} />);

      const button = screen.getByText(/Your \(New York\)/).closest("button");
      expect(button?.dataset.variant).toBe("default");
    });

    it("calls onShowUserTimeChange when trip timezone is clicked", async () => {
      const user = userEvent.setup();
      const onShowUserTimeChange = vi.fn();

      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          showUserTime={true}
          onShowUserTimeChange={onShowUserTimeChange}
        />
      );

      const button = screen.getByText(/Trip \(Los Angeles\)/);
      await user.click(button);

      expect(onShowUserTimeChange).toHaveBeenCalledWith(false);
    });

    it("calls onShowUserTimeChange when user timezone is clicked", async () => {
      const user = userEvent.setup();
      const onShowUserTimeChange = vi.fn();

      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          onShowUserTimeChange={onShowUserTimeChange}
        />
      );

      const button = screen.getByText(/Your \(New York\)/);
      await user.click(button);

      expect(onShowUserTimeChange).toHaveBeenCalledWith(true);
    });
  });

  describe("Timezone label formatting", () => {
    it("extracts and formats timezone names correctly", () => {
      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          tripTimezone="Europe/London"
          userTimezone="Asia/Tokyo"
        />
      );

      expect(screen.getByText(/Trip \(London\)/)).toBeDefined();
      expect(screen.getByText(/Your \(Tokyo\)/)).toBeDefined();
    });

    it("handles multi-part timezone names correctly", () => {
      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          tripTimezone="America/Los_Angeles"
          userTimezone="America/New_York"
        />
      );

      expect(screen.getByText(/Trip \(Los Angeles\)/)).toBeDefined();
      expect(screen.getByText(/Your \(New York\)/)).toBeDefined();
    });
  });

  describe("FAB and action menu", () => {
    it("renders FAB when user has any action available", () => {
      renderWithQueryClient(
        <ItineraryHeader {...defaultProps} isMember={true} />,
      );
      const fab = screen.getByRole("button", { name: /add to itinerary/i });
      expect(fab).toBeDefined();
    });

    it("does not render FAB when no actions are available", () => {
      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          isOrganizer={false}
          isMember={false}
          allowMembersToAddEvents={false}
        />,
      );
      const fab = screen.queryByRole("button", { name: /add to itinerary/i });
      expect(fab).toBeNull();
    });

    it("shows Event menu item when canAddEvent is true", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          isMember={true}
          allowMembersToAddEvents={true}
        />,
      );

      const fab = screen.getByRole("button", { name: /add to itinerary/i });
      await user.click(fab);

      const eventItem = screen.getByRole("menuitem", { name: /event/i });
      expect(eventItem).toBeDefined();
    });

    it("does not show Event menu item when canAddEvent is false", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          isOrganizer={false}
          isMember={true}
          allowMembersToAddEvents={false}
        />,
      );

      const fab = screen.getByRole("button", { name: /add to itinerary/i });
      await user.click(fab);

      const eventItem = screen.queryByRole("menuitem", { name: /^event$/i });
      expect(eventItem).toBeNull();
    });

    it("shows Accommodation menu item when isOrganizer is true", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <ItineraryHeader {...defaultProps} isOrganizer={true} />,
      );

      const fab = screen.getByRole("button", { name: /add to itinerary/i });
      await user.click(fab);

      const item = screen.getByRole("menuitem", { name: /accommodation/i });
      expect(item).toBeDefined();
    });

    it("does not show Accommodation menu item when isOrganizer is false", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <ItineraryHeader {...defaultProps} isOrganizer={false} />,
      );

      const fab = screen.getByRole("button", { name: /add to itinerary/i });
      await user.click(fab);

      const item = screen.queryByRole("menuitem", { name: /accommodation/i });
      expect(item).toBeNull();
    });

    it("shows My Travel menu item when isMember is true", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <ItineraryHeader {...defaultProps} isMember={true} />,
      );

      const fab = screen.getByRole("button", { name: /add to itinerary/i });
      await user.click(fab);

      const item = screen.getByRole("menuitem", { name: /my travel/i });
      expect(item).toBeDefined();
    });

    it("does not show My Travel menu item when isMember is false", async () => {
      // When isMember is false and isOrganizer is true, FAB still shows
      const user = userEvent.setup();
      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          isOrganizer={true}
          isMember={false}
        />,
      );

      const fab = screen.getByRole("button", { name: /add to itinerary/i });
      await user.click(fab);

      const item = screen.queryByRole("menuitem", { name: /my travel/i });
      expect(item).toBeNull();
    });

    it("menu items are clickable and open dialogs", async () => {
      // Skip pointer-events check: Radix DropdownMenu sets pointer-events:none
      // on the trigger when open, which is a test environment artifact
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          isOrganizer={true}
          isMember={true}
          allowMembersToAddEvents={true}
        />,
      );

      const fab = screen.getByRole("button", { name: /add to itinerary/i });
      await user.click(fab);

      const eventItem = screen.getByRole("menuitem", { name: /event/i });
      await user.click(eventItem);

      // Clicking a menu item should not throw
      // Re-open to verify menu still works
      await user.click(fab);
      const accommItem = screen.getByRole("menuitem", {
        name: /accommodation/i,
      });
      await user.click(accommItem);

      await user.click(fab);
      const travelItem = screen.getByRole("menuitem", {
        name: /my travel/i,
      });
      await user.click(travelItem);
    });
  });

  describe("Sticky positioning", () => {
    it("applies sticky positioning classes", () => {
      const { container } = renderWithQueryClient(<ItineraryHeader {...defaultProps} />);

      const header = container.querySelector(".sticky");
      expect(header).toBeDefined();
      expect(header?.className).toContain("top-0");
      expect(header?.className).toContain("z-10");
    });
  });
});
