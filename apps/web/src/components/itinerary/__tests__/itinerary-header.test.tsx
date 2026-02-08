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
