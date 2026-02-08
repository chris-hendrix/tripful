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

  describe("action buttons", () => {
    it("renders Event button when canAddEvent is true", () => {
      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          isMember={true}
          allowMembersToAddEvents={true}
        />,
      );
      const button = screen.getByRole("button", { name: /add event/i });
      expect(button).toBeDefined();
      expect(button.getAttribute("aria-label")).toBe("Add Event");
    });

    it("does not render Event button when canAddEvent is false", () => {
      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          isOrganizer={false}
          isMember={true}
          allowMembersToAddEvents={false}
        />,
      );
      const button = screen.queryByRole("button", { name: /add event/i });
      expect(button).toBeNull();
    });

    it("renders Accommodation button when isOrganizer is true", () => {
      renderWithQueryClient(
        <ItineraryHeader {...defaultProps} isOrganizer={true} />,
      );
      const button = screen.getByRole("button", {
        name: /add accommodation/i,
      });
      expect(button).toBeDefined();
      expect(button.getAttribute("aria-label")).toBe("Add Accommodation");
    });

    it("does not render Accommodation button when isOrganizer is false", () => {
      renderWithQueryClient(
        <ItineraryHeader {...defaultProps} isOrganizer={false} />,
      );
      const button = screen.queryByRole("button", {
        name: /add accommodation/i,
      });
      expect(button).toBeNull();
    });

    it("renders My Travel button when isMember is true", () => {
      renderWithQueryClient(
        <ItineraryHeader {...defaultProps} isMember={true} />,
      );
      const button = screen.getByRole("button", { name: /add my travel/i });
      expect(button).toBeDefined();
      expect(button.getAttribute("aria-label")).toBe("Add My Travel");
    });

    it("does not render My Travel button when isMember is false", () => {
      renderWithQueryClient(
        <ItineraryHeader {...defaultProps} isMember={false} />,
      );
      const button = screen.queryByRole("button", {
        name: /add my travel/i,
      });
      expect(button).toBeNull();
    });

    it("action button text spans have responsive hidden class", () => {
      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          isOrganizer={true}
          isMember={true}
          allowMembersToAddEvents={true}
        />,
      );
      // All three buttons should have hidden sm:inline text
      const eventBtn = screen.getByRole("button", { name: /add event/i });
      const eventSpan = eventBtn.querySelector("span.hidden");
      expect(eventSpan).toBeDefined();
      expect(eventSpan).not.toBeNull();
      expect(eventSpan!.className).toContain("sm:inline");

      const accommBtn = screen.getByRole("button", {
        name: /add accommodation/i,
      });
      const accommSpan = accommBtn.querySelector("span.hidden");
      expect(accommSpan).toBeDefined();
      expect(accommSpan).not.toBeNull();
      expect(accommSpan!.className).toContain("sm:inline");

      const travelBtn = screen.getByRole("button", {
        name: /add my travel/i,
      });
      const travelSpan = travelBtn.querySelector("span.hidden");
      expect(travelSpan).toBeDefined();
      expect(travelSpan).not.toBeNull();
      expect(travelSpan!.className).toContain("sm:inline");
    });

    it("action buttons are clickable", async () => {
      renderWithQueryClient(
        <ItineraryHeader
          {...defaultProps}
          isOrganizer={true}
          isMember={true}
          allowMembersToAddEvents={true}
        />,
      );
      // Skip pointer-events check: Radix Tooltip sets pointer-events:none
      // on the trigger in JSDOM which is a test environment artifact
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      const eventBtn = screen.getByRole("button", { name: /add event/i });
      const accommBtn = screen.getByRole("button", {
        name: /add accommodation/i,
      });
      const travelBtn = screen.getByRole("button", {
        name: /add my travel/i,
      });

      // Verify buttons are not disabled
      expect(eventBtn.hasAttribute("disabled")).toBe(false);
      expect(accommBtn.hasAttribute("disabled")).toBe(false);
      expect(travelBtn.hasAttribute("disabled")).toBe(false);

      // Verify clicking doesn't throw
      await user.click(eventBtn);
      await user.click(accommBtn);
      await user.click(travelBtn);
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
