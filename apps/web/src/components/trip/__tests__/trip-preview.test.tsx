import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TripPreview } from "../trip-preview";
import type { TripDetailWithMeta } from "@/hooks/use-trips";

// Mock sonner
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    fill,
    priority,
    unoptimized,
    sizes,
    ...props
  }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img src={src as string} alt={alt as string} {...props} />
  ),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock useUpdateRsvp hook
const mockUpdateRsvp = vi.fn();
const mockUseUpdateRsvp = vi.fn().mockReturnValue({
  mutate: mockUpdateRsvp,
  isPending: false,
});
vi.mock("@/hooks/use-invitations", () => ({
  useUpdateRsvp: (tripId: string) => mockUseUpdateRsvp(tripId),
  getUpdateRsvpErrorMessage: vi.fn().mockReturnValue("RSVP failed"),
}));

describe("TripPreview", () => {
  const mockTrip: TripDetailWithMeta = {
    id: "trip-1",
    name: "Summer Vacation",
    destination: "Paris, France",
    startDate: "2026-07-01",
    endDate: "2026-07-14",
    preferredTimezone: "Europe/Paris",
    description: "A wonderful summer trip",
    coverImageUrl: "https://example.com/cover.jpg",
    createdBy: "user-1",
    allowMembersToAddEvents: true,
    cancelled: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    organizers: [
      { id: "user-1", displayName: "John Doe", profilePhotoUrl: null },
      {
        id: "user-2",
        displayName: "Jane Smith",
        profilePhotoUrl: "https://example.com/jane.jpg",
      },
    ],
    memberCount: 5,
    isPreview: true,
    userRsvpStatus: "no_response",
    isOrganizer: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdateRsvp.mockReturnValue({
      mutate: mockUpdateRsvp,
      isPending: false,
    });
  });

  it("renders trip name, destination, and date range", () => {
    render(<TripPreview trip={mockTrip} tripId="trip-1" />);

    expect(
      screen.getByRole("heading", { name: "Summer Vacation" }),
    ).toBeDefined();
    expect(screen.getByText("Paris, France")).toBeDefined();
    expect(screen.getByText("Jul 1 - 14, 2026")).toBeDefined();
  });

  it("renders cover image when coverImageUrl exists", () => {
    render(<TripPreview trip={mockTrip} tripId="trip-1" />);

    const coverImage = screen.getByAltText("Summer Vacation");
    expect(coverImage).toBeDefined();
    expect(coverImage.getAttribute("src")).toBe(
      "https://example.com/cover.jpg",
    );
  });

  it("renders gradient placeholder when no cover image", () => {
    const tripWithoutCover = { ...mockTrip, coverImageUrl: null };
    const { container } = render(
      <TripPreview trip={tripWithoutCover} tripId="trip-1" />,
    );

    const placeholder = container.querySelector(
      ".bg-gradient-to-br.from-primary\\/20.via-accent\\/15.to-secondary\\/20",
    );
    expect(placeholder).not.toBeNull();
  });

  it("renders organizer names and avatars", () => {
    render(<TripPreview trip={mockTrip} tripId="trip-1" />);

    expect(screen.getByText(/Organized by/)).toBeDefined();
    expect(screen.getByText(/John Doe, Jane Smith/)).toBeDefined();

    // John Doe has no photo, should show initials
    expect(screen.getByText("JD")).toBeDefined();

    // Jane Smith has a profile photo
    const janeAvatar = screen.getByAltText("Jane Smith");
    expect(janeAvatar).toBeDefined();
    expect(janeAvatar.getAttribute("src")).toBe("https://example.com/jane.jpg");
  });

  it("renders member count", () => {
    render(<TripPreview trip={mockTrip} tripId="trip-1" />);

    expect(screen.getByText("5 members")).toBeDefined();
  });

  it("shows invitation banner message", () => {
    render(<TripPreview trip={mockTrip} tripId="trip-1" />);

    expect(screen.getByText("You've been invited!")).toBeDefined();
    expect(screen.getByText("RSVP to see the full itinerary.")).toBeDefined();
  });

  it("renders all 3 RSVP buttons", () => {
    render(<TripPreview trip={mockTrip} tripId="trip-1" />);

    const rsvpContainer = screen.getByTestId("rsvp-buttons");
    expect(rsvpContainer).toBeDefined();
    expect(screen.getByRole("button", { name: "Going" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Maybe" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Not Going" })).toBeDefined();
  });

  it("highlights current RSVP status button as active (going)", () => {
    const tripGoing = { ...mockTrip, userRsvpStatus: "going" as const };
    render(<TripPreview trip={tripGoing} tripId="trip-1" />);

    const goingButton = screen.getByRole("button", { name: "Going" });
    expect(goingButton.className).toContain("bg-success");
  });

  it("highlights current RSVP status button as active (maybe)", () => {
    const tripMaybe = { ...mockTrip, userRsvpStatus: "maybe" as const };
    render(<TripPreview trip={tripMaybe} tripId="trip-1" />);

    const maybeButton = screen.getByRole("button", { name: "Maybe" });
    expect(maybeButton.className).toContain("bg-warning");
  });

  it("highlights current RSVP status button as active (not_going)", () => {
    const tripNotGoing = {
      ...mockTrip,
      userRsvpStatus: "not_going" as const,
    };
    render(<TripPreview trip={tripNotGoing} tripId="trip-1" />);

    const notGoingButton = screen.getByRole("button", { name: "Not Going" });
    expect(notGoingButton.className).toContain("bg-destructive/15");
  });

  it("calls useUpdateRsvp with correct tripId", () => {
    render(<TripPreview trip={mockTrip} tripId="trip-1" />);

    expect(mockUseUpdateRsvp).toHaveBeenCalledWith("trip-1");
  });

  it("clicking Going button calls mutate with { status: 'going' }", async () => {
    const user = userEvent.setup();
    render(<TripPreview trip={mockTrip} tripId="trip-1" />);

    const goingButton = screen.getByRole("button", { name: "Going" });
    await user.click(goingButton);

    expect(mockUpdateRsvp).toHaveBeenCalledWith(
      { status: "going" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("clicking Maybe button calls mutate with { status: 'maybe' }", async () => {
    const user = userEvent.setup();
    render(<TripPreview trip={mockTrip} tripId="trip-1" />);

    const maybeButton = screen.getByRole("button", { name: "Maybe" });
    await user.click(maybeButton);

    expect(mockUpdateRsvp).toHaveBeenCalledWith(
      { status: "maybe" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("clicking Not Going button calls mutate with { status: 'not_going' }", async () => {
    const user = userEvent.setup();
    render(<TripPreview trip={mockTrip} tripId="trip-1" />);

    const notGoingButton = screen.getByRole("button", { name: "Not Going" });
    await user.click(notGoingButton);

    expect(mockUpdateRsvp).toHaveBeenCalledWith(
      { status: "not_going" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("shows loading state on RSVP button when isPending", () => {
    mockUseUpdateRsvp.mockReturnValue({
      mutate: mockUpdateRsvp,
      isPending: true,
    });
    const tripGoing = { ...mockTrip, userRsvpStatus: "going" as const };
    render(<TripPreview trip={tripGoing} tripId="trip-1" />);

    // All buttons should be disabled when pending
    const goingButton = screen.getByRole("button", { name: "Going" });
    expect(goingButton).toHaveProperty("disabled", true);

    const maybeButton = screen.getByRole("button", { name: "Maybe" });
    expect(maybeButton).toHaveProperty("disabled", true);

    const notGoingButton = screen.getByRole("button", { name: "Not Going" });
    expect(notGoingButton).toHaveProperty("disabled", true);
  });

  it("renders description when available", () => {
    render(<TripPreview trip={mockTrip} tripId="trip-1" />);

    expect(screen.getByText("A wonderful summer trip")).toBeDefined();
  });

  it("does NOT render description when not provided", () => {
    const tripWithoutDescription = { ...mockTrip, description: null };
    render(<TripPreview trip={tripWithoutDescription} tripId="trip-1" />);

    expect(screen.queryByText("A wonderful summer trip")).toBeNull();
  });

  it("calls onGoingSuccess when RSVP going succeeds", async () => {
    const onGoingSuccess = vi.fn();
    mockUpdateRsvp.mockImplementation((_data: any, options: any) => {
      options.onSuccess();
    });

    const user = userEvent.setup();
    render(
      <TripPreview
        trip={mockTrip}
        tripId="trip-1"
        onGoingSuccess={onGoingSuccess}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Going" }));

    expect(onGoingSuccess).toHaveBeenCalledOnce();
  });

  it("does NOT call onGoingSuccess when RSVP maybe succeeds", async () => {
    const onGoingSuccess = vi.fn();
    mockUpdateRsvp.mockImplementation((_data: any, options: any) => {
      options.onSuccess();
    });

    const user = userEvent.setup();
    render(
      <TripPreview
        trip={mockTrip}
        tripId="trip-1"
        onGoingSuccess={onGoingSuccess}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Maybe" }));

    expect(onGoingSuccess).not.toHaveBeenCalled();
  });

  it("does NOT call onGoingSuccess when RSVP not_going succeeds", async () => {
    const onGoingSuccess = vi.fn();
    mockUpdateRsvp.mockImplementation((_data: any, options: any) => {
      options.onSuccess();
    });

    const user = userEvent.setup();
    render(
      <TripPreview
        trip={mockTrip}
        tripId="trip-1"
        onGoingSuccess={onGoingSuccess}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Not Going" }));

    expect(onGoingSuccess).not.toHaveBeenCalled();
  });

  it("does not crash when onGoingSuccess is not provided and RSVP going succeeds", async () => {
    mockUpdateRsvp.mockImplementation((_data: any, options: any) => {
      options.onSuccess();
    });

    const user = userEvent.setup();
    render(<TripPreview trip={mockTrip} tripId="trip-1" />);

    await user.click(screen.getByRole("button", { name: "Going" }));

    expect(mockToast.success).toHaveBeenCalledWith('RSVP updated to "Going"');
  });
});
