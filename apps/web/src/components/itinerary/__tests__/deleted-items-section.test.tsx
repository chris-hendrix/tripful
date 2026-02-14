import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeletedItemsSection } from "../deleted-items-section";
import type { Event, Accommodation, MemberTravel } from "@tripful/shared/types";

// Mock data
const mockDeletedEvent: Event = {
  id: "event-del-1",
  tripId: "trip-123",
  createdBy: "user-123",
  name: "Deleted Beach Party",
  description: null,
  eventType: "activity",
  location: null,
  meetupLocation: null,
  meetupTime: null,
  startTime: new Date("2026-07-16T12:00:00Z"),
  endTime: null,
  allDay: false,
  isOptional: false,
  links: null,
  deletedAt: new Date("2026-07-10T15:30:00Z"),
  deletedBy: "user-123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDeletedAccommodation: Accommodation = {
  id: "acc-del-1",
  tripId: "trip-123",
  createdBy: "user-123",
  name: "Deleted Hotel Stay",
  address: "456 Palm Ave",
  description: null,
  checkIn: "2026-07-15",
  checkOut: "2026-07-18",
  links: null,
  deletedAt: new Date("2026-07-09T10:00:00Z"),
  deletedBy: "user-123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDeletedMemberTravel: MemberTravel = {
  id: "mt-del-1",
  tripId: "trip-123",
  memberId: "member-1",
  travelType: "arrival",
  time: new Date("2026-07-15T08:00:00Z"),
  location: "LAX",
  details: null,
  deletedAt: new Date("2026-07-08T09:00:00Z"),
  deletedBy: "user-123",
  createdAt: new Date(),
  updatedAt: new Date(),
  memberName: "Alice",
};

// Mock hooks
const mockUseEventsWithDeleted = vi.fn();
const mockUseAccommodationsWithDeleted = vi.fn();
const mockUseMemberTravelsWithDeleted = vi.fn();
const mockRestoreEventMutate = vi.fn();
const mockRestoreAccommodationMutate = vi.fn();
const mockRestoreMemberTravelMutate = vi.fn();

vi.mock("@/hooks/use-events", () => ({
  useEventsWithDeleted: () => mockUseEventsWithDeleted(),
  useRestoreEvent: () => ({
    mutate: mockRestoreEventMutate,
    isPending: false,
    variables: undefined,
  }),
  getRestoreEventErrorMessage: () => "Failed to restore event",
}));

vi.mock("@/hooks/use-accommodations", () => ({
  useAccommodationsWithDeleted: () => mockUseAccommodationsWithDeleted(),
  useRestoreAccommodation: () => ({
    mutate: mockRestoreAccommodationMutate,
    isPending: false,
    variables: undefined,
  }),
  getRestoreAccommodationErrorMessage: () => "Failed to restore accommodation",
}));

vi.mock("@/hooks/use-member-travel", () => ({
  useMemberTravelsWithDeleted: () => mockUseMemberTravelsWithDeleted(),
  useRestoreMemberTravel: () => ({
    mutate: mockRestoreMemberTravelMutate,
    isPending: false,
    variables: undefined,
  }),
  getRestoreMemberTravelErrorMessage: () =>
    "Failed to restore member travel",
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("DeletedItemsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEventsWithDeleted.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });
    mockUseAccommodationsWithDeleted.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });
    mockUseMemberTravelsWithDeleted.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });
  });

  it("renders nothing when there are no deleted items", () => {
    const { container } = render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders the section when there are deleted events", () => {
    mockUseEventsWithDeleted.mockReturnValue({
      data: [mockDeletedEvent],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    expect(screen.getByText("Deleted Items (1)")).toBeDefined();
  });

  it("shows correct count for multiple deleted item types", () => {
    mockUseEventsWithDeleted.mockReturnValue({
      data: [mockDeletedEvent],
      isPending: false,
      isError: false,
    });
    mockUseAccommodationsWithDeleted.mockReturnValue({
      data: [mockDeletedAccommodation],
      isPending: false,
      isError: false,
    });
    mockUseMemberTravelsWithDeleted.mockReturnValue({
      data: [mockDeletedMemberTravel],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    expect(screen.getByText("Deleted Items (3)")).toBeDefined();
  });

  it("filters out non-deleted items from the count", () => {
    const activeEvent: Event = {
      ...mockDeletedEvent,
      id: "event-active",
      name: "Active Event",
      deletedAt: null,
      deletedBy: null,
    };

    mockUseEventsWithDeleted.mockReturnValue({
      data: [activeEvent, mockDeletedEvent],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    // Only the deleted event should be counted
    expect(screen.getByText("Deleted Items (1)")).toBeDefined();
  });

  it("is collapsed by default", () => {
    mockUseEventsWithDeleted.mockReturnValue({
      data: [mockDeletedEvent],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    // The item name should not be visible when collapsed
    expect(screen.queryByText("Deleted Beach Party")).toBeNull();
  });

  it("expands to show deleted items when toggle is clicked", async () => {
    const user = userEvent.setup();

    mockUseEventsWithDeleted.mockReturnValue({
      data: [mockDeletedEvent],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    // Click the toggle button
    const toggleButton = screen.getByText("Deleted Items (1)").closest("button")!;
    await user.click(toggleButton);

    // The deleted event name should now be visible
    expect(screen.getByText("Deleted Beach Party")).toBeDefined();
  });

  it("shows deleted items grouped by type", async () => {
    const user = userEvent.setup();

    mockUseEventsWithDeleted.mockReturnValue({
      data: [mockDeletedEvent],
      isPending: false,
      isError: false,
    });
    mockUseAccommodationsWithDeleted.mockReturnValue({
      data: [mockDeletedAccommodation],
      isPending: false,
      isError: false,
    });
    mockUseMemberTravelsWithDeleted.mockReturnValue({
      data: [mockDeletedMemberTravel],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    const toggleButton = screen.getByText("Deleted Items (3)").closest("button")!;
    await user.click(toggleButton);

    // Check group headers
    expect(screen.getByText("Events")).toBeDefined();
    expect(screen.getByText("Accommodations")).toBeDefined();
    expect(screen.getByText("Member Travel")).toBeDefined();

    // Check item names
    expect(screen.getByText("Deleted Beach Party")).toBeDefined();
    expect(screen.getByText("Deleted Hotel Stay")).toBeDefined();
    expect(screen.getByText("Alice - arrival")).toBeDefined();
  });

  it("shows restore button for each deleted item", async () => {
    const user = userEvent.setup();

    mockUseEventsWithDeleted.mockReturnValue({
      data: [mockDeletedEvent],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    const toggleButton = screen.getByText("Deleted Items (1)").closest("button")!;
    await user.click(toggleButton);

    const restoreButton = screen.getByRole("button", { name: /Restore/i });
    expect(restoreButton).toBeDefined();
  });

  it("calls restore event hook when restore button is clicked", async () => {
    const user = userEvent.setup();

    mockUseEventsWithDeleted.mockReturnValue({
      data: [mockDeletedEvent],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    const toggleButton = screen.getByText("Deleted Items (1)").closest("button")!;
    await user.click(toggleButton);

    const restoreButton = screen.getByRole("button", { name: /Restore/i });
    await user.click(restoreButton);

    expect(mockRestoreEventMutate).toHaveBeenCalledWith(
      "event-del-1",
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("calls restore accommodation hook when restore button is clicked", async () => {
    const user = userEvent.setup();

    mockUseAccommodationsWithDeleted.mockReturnValue({
      data: [mockDeletedAccommodation],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    const toggleButton = screen.getByText("Deleted Items (1)").closest("button")!;
    await user.click(toggleButton);

    const restoreButton = screen.getByRole("button", { name: /Restore/i });
    await user.click(restoreButton);

    expect(mockRestoreAccommodationMutate).toHaveBeenCalledWith(
      "acc-del-1",
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("calls restore member travel hook when restore button is clicked", async () => {
    const user = userEvent.setup();

    mockUseMemberTravelsWithDeleted.mockReturnValue({
      data: [mockDeletedMemberTravel],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    const toggleButton = screen.getByText("Deleted Items (1)").closest("button")!;
    await user.click(toggleButton);

    const restoreButton = screen.getByRole("button", { name: /Restore/i });
    await user.click(restoreButton);

    expect(mockRestoreMemberTravelMutate).toHaveBeenCalledWith(
      "mt-del-1",
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("does not show group headers for types with no deleted items", async () => {
    const user = userEvent.setup();

    mockUseEventsWithDeleted.mockReturnValue({
      data: [mockDeletedEvent],
      isPending: false,
      isError: false,
    });
    // accommodations and member travels have no deleted items (default empty)

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    const toggleButton = screen.getByText("Deleted Items (1)").closest("button")!;
    await user.click(toggleButton);

    expect(screen.getByText("Events")).toBeDefined();
    expect(screen.queryByText("Accommodations")).toBeNull();
    expect(screen.queryByText("Member Travel")).toBeNull();
  });

  it("displays member travel label with member name and travel type", async () => {
    const user = userEvent.setup();

    mockUseMemberTravelsWithDeleted.mockReturnValue({
      data: [mockDeletedMemberTravel],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    const toggleButton = screen.getByText("Deleted Items (1)").closest("button")!;
    await user.click(toggleButton);

    expect(screen.getByText("Alice - arrival")).toBeDefined();
  });

  it("displays travel type as label when member name is missing", async () => {
    const user = userEvent.setup();
    const travelWithoutName: MemberTravel = {
      ...mockDeletedMemberTravel,
      memberName: undefined,
    };

    mockUseMemberTravelsWithDeleted.mockReturnValue({
      data: [travelWithoutName],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    const toggleButton = screen.getByText("Deleted Items (1)").closest("button")!;
    await user.click(toggleButton);

    // Should show just the travel type when no member name
    // The text appears in both the item label and the badge, so use getAllByText
    const arrivalTexts = screen.getAllByText("arrival");
    expect(arrivalTexts.length).toBeGreaterThan(0);
  });

  it("collapses back when toggle is clicked again", async () => {
    const user = userEvent.setup();

    mockUseEventsWithDeleted.mockReturnValue({
      data: [mockDeletedEvent],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    const toggleButton = screen.getByText("Deleted Items (1)").closest("button")!;

    // Expand
    await user.click(toggleButton);
    expect(screen.getByText("Deleted Beach Party")).toBeDefined();

    // Collapse
    await user.click(toggleButton);
    await waitFor(() => {
      expect(screen.queryByText("Deleted Beach Party")).toBeNull();
    });
  });

  it("sets aria-expanded correctly on the toggle button", async () => {
    const user = userEvent.setup();

    mockUseEventsWithDeleted.mockReturnValue({
      data: [mockDeletedEvent],
      isPending: false,
      isError: false,
    });

    render(
      <Wrapper>
        <DeletedItemsSection tripId="trip-123" timezone="UTC" />
      </Wrapper>,
    );

    const toggleButton = screen.getByText("Deleted Items (1)").closest("button")!;
    expect(toggleButton.getAttribute("aria-expanded")).toBe("false");

    await user.click(toggleButton);
    expect(toggleButton.getAttribute("aria-expanded")).toBe("true");
  });
});
