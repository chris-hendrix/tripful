import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TripDetailPage from "./page";
import type { TripDetail } from "@/hooks/use-trips";
import type { User } from "@tripful/shared";

// Mock next/navigation
const mockPush = vi.fn();
const mockParams = { id: "trip-123" };
vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useAuth hook
const mockUser: User = {
  id: "user-123",
  phoneNumber: "+14155551234",
  displayName: "John Doe",
  profilePhotoUrl: "https://example.com/john.jpg",
  timezone: "America/New_York",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

const mockUseAuth = vi.fn();
vi.mock("@/app/providers/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useTripDetail hook
const mockUseTripDetail = vi.fn();
vi.mock("@/hooks/use-trips", () => ({
  useTripDetail: (tripId: string) => mockUseTripDetail(tripId),
}));

// Mock EditTripDialog component
vi.mock("@/components/trip/edit-trip-dialog", () => ({
  EditTripDialog: ({
    open,
    onOpenChange,
    trip,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: TripDetail;
  }) => (
    <div data-testid="edit-trip-dialog" data-open={open}>
      <button onClick={() => onOpenChange(false)}>Close Dialog</button>
      <span>Editing: {trip.name}</span>
    </div>
  ),
}));

describe("TripDetailPage", () => {
  const mockTripDetail: TripDetail = {
    id: "trip-123",
    name: "Bachelor Party in Miami",
    destination: "Miami Beach, FL",
    startDate: "2026-06-01",
    endDate: "2026-06-05",
    preferredTimezone: "America/New_York",
    description: "Epic bachelor party weekend with the crew!",
    coverImageUrl: "https://example.com/cover.jpg",
    createdBy: "user-123",
    allowMembersToAddEvents: true,
    cancelled: false,
    createdAt: new Date("2026-02-06T12:00:00Z"),
    updatedAt: new Date("2026-02-06T12:00:00Z"),
    organizers: [
      {
        id: "user-123",
        displayName: "John Doe",
        phoneNumber: "+14155551234",
        profilePhotoUrl: "https://example.com/john.jpg",
        timezone: "America/New_York",
      },
      {
        id: "user-456",
        displayName: "Jane Smith",
        phoneNumber: "+14155555678",
        profilePhotoUrl: null,
        timezone: "America/Los_Angeles",
      },
    ],
    memberCount: 8,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  describe("rendering tests", () => {
    it("renders loading state initially", () => {
      mockUseTripDetail.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      // Check for skeleton loading state
      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it("renders trip details when data loaded", async () => {
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Bachelor Party in Miami")).toBeDefined();
      });

      expect(screen.getByText("Miami Beach, FL")).toBeDefined();
      expect(screen.getByText("Jun 1 - 5, 2026")).toBeDefined();
      expect(screen.getByText("8 members")).toBeDefined();
      expect(screen.getByText("0 events")).toBeDefined();
    });

    it("shows cover image when available", async () => {
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        const coverImage = screen.getByAltText("Bachelor Party in Miami");
        expect(coverImage).toBeDefined();
        expect(coverImage.getAttribute("src")).toBe(
          "https://example.com/cover.jpg",
        );
      });
    });

    it("shows placeholder when no cover image", async () => {
      const tripWithoutCover = { ...mockTripDetail, coverImageUrl: null };
      mockUseTripDetail.mockReturnValue({
        data: tripWithoutCover,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Bachelor Party in Miami")).toBeDefined();
      });

      // Check for gradient placeholder
      const placeholder = document.querySelector(
        ".bg-gradient-to-br.from-slate-100.to-blue-100",
      );
      expect(placeholder).toBeDefined();
    });

    it("displays trip name, destination, dates", async () => {
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Bachelor Party in Miami")).toBeDefined();
        expect(screen.getByText("Miami Beach, FL")).toBeDefined();
        expect(screen.getByText("Jun 1 - 5, 2026")).toBeDefined();
      });
    });

    it("shows organizer information", async () => {
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Organizers")).toBeDefined();
        expect(screen.getByText("John Doe, Jane Smith")).toBeDefined();
      });

      // Check for organizer avatars
      const johnAvatar = screen.getByAltText("John Doe");
      expect(johnAvatar).toBeDefined();
      expect(johnAvatar.getAttribute("src")).toBe(
        "https://example.com/john.jpg",
      );

      // Jane Smith has no profile photo, should show initials
      expect(screen.getByText("JS")).toBeDefined();
    });

    it("displays member count and event count", async () => {
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("8 members")).toBeDefined();
        expect(screen.getByText("0 events")).toBeDefined();
      });
    });

    it("shows RSVP badge", async () => {
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Going")).toBeDefined();
      });
    });

    it("shows description when available", async () => {
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("About this trip")).toBeDefined();
        expect(
          screen.getByText("Epic bachelor party weekend with the crew!"),
        ).toBeDefined();
      });
    });

    it("hides description section when description is null", async () => {
      const tripWithoutDescription = { ...mockTripDetail, description: null };
      mockUseTripDetail.mockReturnValue({
        data: tripWithoutDescription,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Bachelor Party in Miami")).toBeDefined();
      });

      expect(screen.queryByText("About this trip")).toBeNull();
    });
  });

  describe("authorization tests", () => {
    it("shows edit button when user is creator", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Edit trip")).toBeDefined();
      });
    });

    it("shows edit button when user is co-organizer", async () => {
      const coOrganizerUser = { ...mockUser, id: "user-456" };
      mockUseAuth.mockReturnValue({ user: coOrganizerUser });
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Edit trip")).toBeDefined();
      });
    });

    it("hides edit button when user is not organizer", async () => {
      const regularUser = { ...mockUser, id: "user-789" };
      mockUseAuth.mockReturnValue({ user: regularUser });
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Bachelor Party in Miami")).toBeDefined();
      });

      expect(screen.queryByText("Edit trip")).toBeNull();
    });

    it("shows organizer badge for organizers only", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Organizing")).toBeDefined();
      });
    });

    it("hides organizer badge for non-organizers", async () => {
      const regularUser = { ...mockUser, id: "user-789" };
      mockUseAuth.mockReturnValue({ user: regularUser });
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Bachelor Party in Miami")).toBeDefined();
      });

      expect(screen.queryByText("Organizing")).toBeNull();
    });
  });

  describe("error handling tests", () => {
    it("shows error state on 404", async () => {
      mockUseTripDetail.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("NOT_FOUND"),
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Trip not found")).toBeDefined();
      });

      expect(
        screen.getByText(
          "This trip doesn't exist or you don't have access to it.",
        ),
      ).toBeDefined();
    });

    it("shows error state on network failure", async () => {
      mockUseTripDetail.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Network error"),
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Trip not found")).toBeDefined();
      });
    });

    it("return to dashboard button navigates correctly", async () => {
      mockUseTripDetail.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("NOT_FOUND"),
        refetch: vi.fn(),
      });

      const user = userEvent.setup();
      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Trip not found")).toBeDefined();
      });

      const returnButton = screen.getByText("Return to dashboard");
      await user.click(returnButton);

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("interaction tests", () => {
    it("edit button opens EditTripDialog", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const user = userEvent.setup();
      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Edit trip")).toBeDefined();
      });

      const editButton = screen.getByText("Edit trip");
      await user.click(editButton);

      await waitFor(() => {
        const dialog = screen.getByTestId("edit-trip-dialog");
        expect(dialog).toBeDefined();
        expect(dialog.getAttribute("data-open")).toBe("true");
      });
    });

    it("can close EditTripDialog", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockUseTripDetail.mockReturnValue({
        data: mockTripDetail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const user = userEvent.setup();
      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Edit trip")).toBeDefined();
      });

      // Open dialog
      const editButton = screen.getByText("Edit trip");
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId("edit-trip-dialog").getAttribute("data-open")).toBe(
          "true",
        );
      });

      // Close dialog
      const closeButton = screen.getByText("Close Dialog");
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.getByTestId("edit-trip-dialog").getAttribute("data-open")).toBe(
          "false",
        );
      });
    });
  });

  describe("edge cases", () => {
    it("handles missing dates (shows Dates TBD)", async () => {
      const tripWithoutDates = {
        ...mockTripDetail,
        startDate: null,
        endDate: null,
      };
      mockUseTripDetail.mockReturnValue({
        data: tripWithoutDates,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Dates TBD")).toBeDefined();
      });
    });

    it("handles null description (doesn't render section)", async () => {
      const tripWithoutDescription = { ...mockTripDetail, description: null };
      mockUseTripDetail.mockReturnValue({
        data: tripWithoutDescription,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Bachelor Party in Miami")).toBeDefined();
      });

      expect(screen.queryByText("About this trip")).toBeNull();
    });

    it("handles empty organizers list", async () => {
      const tripWithoutOrganizers = { ...mockTripDetail, organizers: [] };
      mockUseTripDetail.mockReturnValue({
        data: tripWithoutOrganizers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Bachelor Party in Miami")).toBeDefined();
      });

      // Organizers section should not be rendered
      expect(screen.queryByText("Organizers")).toBeNull();
    });

    it("handles 0 members", async () => {
      const tripWithNoMembers = { ...mockTripDetail, memberCount: 0 };
      mockUseTripDetail.mockReturnValue({
        data: tripWithNoMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("0 members")).toBeDefined();
      });
    });

    it("handles 1 member (singular)", async () => {
      const tripWithOneMember = { ...mockTripDetail, memberCount: 1 };
      mockUseTripDetail.mockReturnValue({
        data: tripWithOneMember,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("1 member")).toBeDefined();
      });
    });

    it("handles dates spanning different months", async () => {
      const tripCrossMonth = {
        ...mockTripDetail,
        startDate: "2026-06-28",
        endDate: "2026-07-05",
      };
      mockUseTripDetail.mockReturnValue({
        data: tripCrossMonth,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Jun 28 - Jul 5, 2026")).toBeDefined();
      });
    });

    it("handles only start date", async () => {
      const tripOnlyStart = {
        ...mockTripDetail,
        startDate: "2026-06-01",
        endDate: null,
      };
      mockUseTripDetail.mockReturnValue({
        data: tripOnlyStart,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Starts Jun 1, 2026")).toBeDefined();
      });
    });

    it("handles only end date", async () => {
      const tripOnlyEnd = {
        ...mockTripDetail,
        startDate: null,
        endDate: "2026-06-05",
      };
      mockUseTripDetail.mockReturnValue({
        data: tripOnlyEnd,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<TripDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Ends Jun 5, 2026")).toBeDefined();
      });
    });
  });
});
