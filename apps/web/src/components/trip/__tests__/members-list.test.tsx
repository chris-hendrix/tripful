import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MembersList } from "../members-list";
import type { MemberWithProfile, Invitation } from "@/hooks/use-invitations";

// Mock sonner
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock format
vi.mock("@/lib/format", () => ({
  getInitials: (name: string) =>
    name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2),
  formatPhoneNumber: (phone: string) => phone,
}));

// Mock hooks
const mockUseMembers = vi.fn();
const mockUseInvitations = vi.fn();
const mockRevokeMutate = vi.fn();
const mockUseRevokeInvitation = vi.fn();

vi.mock("@/hooks/use-invitations", () => ({
  useMembers: (tripId: string) => mockUseMembers(tripId),
  useInvitations: (tripId: string) => mockUseInvitations(tripId),
  useRevokeInvitation: (tripId: string) => mockUseRevokeInvitation(tripId),
  getRevokeInvitationErrorMessage: () => "Failed to remove member",
}));

let queryClient: QueryClient;

const mockMembers: MemberWithProfile[] = [
  {
    id: "member-1",
    userId: "user-1",
    displayName: "John Doe",
    profilePhotoUrl: "https://example.com/john.jpg",
    phoneNumber: "+14155551234",
    status: "going",
    isOrganizer: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "member-2",
    userId: "user-2",
    displayName: "Jane Smith",
    profilePhotoUrl: null,
    phoneNumber: "+14155555678",
    status: "maybe",
    isOrganizer: false,
    createdAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "member-3",
    userId: "user-3",
    displayName: "Bob Wilson",
    profilePhotoUrl: null,
    phoneNumber: "+14155559999",
    status: "not_going",
    isOrganizer: false,
    createdAt: "2026-01-03T00:00:00Z",
  },
  {
    id: "member-4",
    userId: "user-4",
    displayName: "Alice Brown",
    profilePhotoUrl: null,
    status: "no_response",
    isOrganizer: false,
    createdAt: "2026-01-04T00:00:00Z",
  },
];

const mockInvitations: Invitation[] = [
  {
    id: "inv-2",
    tripId: "trip-123",
    inviterId: "user-1",
    inviteePhone: "+14155555678",
    status: "accepted",
    sentAt: "2026-01-01T00:00:00Z",
    respondedAt: "2026-01-02T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "inv-3",
    tripId: "trip-123",
    inviterId: "user-1",
    inviteePhone: "+14155559999",
    status: "accepted",
    sentAt: "2026-01-01T00:00:00Z",
    respondedAt: "2026-01-03T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-03T00:00:00Z",
  },
];

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
  vi.clearAllMocks();

  mockUseMembers.mockReturnValue({
    data: mockMembers,
    isPending: false,
  });

  mockUseInvitations.mockReturnValue({
    data: mockInvitations,
    isPending: false,
  });

  mockUseRevokeInvitation.mockReturnValue({
    mutate: mockRevokeMutate,
    isPending: false,
  });
});

const renderWithQueryClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe("MembersList", () => {
  describe("loading state", () => {
    it("renders skeleton loading state when data is pending", () => {
      mockUseMembers.mockReturnValue({
        data: undefined,
        isPending: true,
      });

      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.getByTestId("members-list-skeleton")).toBeDefined();
      expect(screen.getByText("Members")).toBeDefined();
    });
  });

  describe("member rendering", () => {
    it("renders member display names", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.getByText("John Doe")).toBeDefined();
      expect(screen.getByText("Jane Smith")).toBeDefined();
      expect(screen.getByText("Bob Wilson")).toBeDefined();
      expect(screen.getByText("Alice Brown")).toBeDefined();
    });

    it("renders member count in heading", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.getByText("Members (4)")).toBeDefined();
    });

    it("renders avatar containers for all members", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      // Radix Avatar doesn't render <img> in jsdom (no image loading support),
      // but we verify avatars are rendered by checking for the avatar slots
      const avatars = document.querySelectorAll("[data-slot='avatar']");
      expect(avatars.length).toBe(4);
    });

    it("renders member avatars with initials fallback when no photo", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.getByText("JS")).toBeDefined();
      expect(screen.getByText("BW")).toBeDefined();
      expect(screen.getByText("AB")).toBeDefined();
    });
  });

  describe("RSVP status badges", () => {
    it("shows Going badge for going status", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.getByText("Going")).toBeDefined();
    });

    it("shows Maybe badge for maybe status", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.getByText("Maybe")).toBeDefined();
    });

    it("shows Not Going badge for not_going status", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.getByText("Not Going")).toBeDefined();
    });

    it("shows No Response badge for no_response status", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.getByText("No Response")).toBeDefined();
    });

    it("Going badge uses correct color classes", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      const goingBadge = screen.getByText("Going").closest("[data-slot='badge']");
      expect(goingBadge).not.toBeNull();
      expect(goingBadge!.className).toContain("bg-success/15");
      expect(goingBadge!.className).toContain("text-success");
    });

    it("Maybe badge uses correct color classes", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      const maybeBadge = screen.getByText("Maybe").closest("[data-slot='badge']");
      expect(maybeBadge).not.toBeNull();
      expect(maybeBadge!.className).toContain("bg-amber-500/15");
      expect(maybeBadge!.className).toContain("text-amber-600");
    });

    it("Not Going badge uses correct color classes", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      const notGoingBadge = screen
        .getByText("Not Going")
        .closest("[data-slot='badge']");
      expect(notGoingBadge).not.toBeNull();
      expect(notGoingBadge!.className).toContain("bg-destructive/15");
      expect(notGoingBadge!.className).toContain("text-destructive");
    });

    it("No Response badge uses correct color classes", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      const noResponseBadge = screen
        .getByText("No Response")
        .closest("[data-slot='badge']");
      expect(noResponseBadge).not.toBeNull();
      expect(noResponseBadge!.className).toContain("bg-muted");
      expect(noResponseBadge!.className).toContain("text-muted-foreground");
    });
  });

  describe("organizer badge", () => {
    it("shows Organizer badge for organizer members", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.getByText("Organizer")).toBeDefined();
    });

    it("Organizer badge uses gradient styling", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      const organizerBadge = screen
        .getByText("Organizer")
        .closest("[data-slot='badge']");
      expect(organizerBadge).not.toBeNull();
      expect(organizerBadge!.className).toContain("bg-gradient-to-r");
      expect(organizerBadge!.className).toContain("from-primary");
      expect(organizerBadge!.className).toContain("to-accent");
    });

    it("does not show Organizer badge for non-organizer members", () => {
      const nonOrganizerMembers: MemberWithProfile[] = [
        {
          id: "member-2",
          userId: "user-2",
          displayName: "Jane Smith",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: false,
          createdAt: "2026-01-02T00:00:00Z",
        },
      ];

      mockUseMembers.mockReturnValue({
        data: nonOrganizerMembers,
        isPending: false,
      });

      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.queryByText("Organizer")).toBeNull();
    });
  });

  describe("organizer-only features", () => {
    it("shows phone numbers when isOrganizer is true and phoneNumber is available", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      expect(screen.getByText("+14155551234")).toBeDefined();
      expect(screen.getByText("+14155555678")).toBeDefined();
      expect(screen.getByText("+14155559999")).toBeDefined();
    });

    it("does NOT show phone numbers when isOrganizer is false", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.queryByText("+14155551234")).toBeNull();
      expect(screen.queryByText("+14155555678")).toBeNull();
    });

    it("shows invite button for organizers", () => {
      const onInvite = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          onInvite={onInvite}
        />,
      );

      expect(screen.getByText("Invite")).toBeDefined();
    });

    it("does NOT show invite button for non-organizers", () => {
      const onInvite = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={false}
          onInvite={onInvite}
        />,
      );

      expect(screen.queryByText("Invite")).toBeNull();
    });

    it("calls onInvite when invite button is clicked", async () => {
      const user = userEvent.setup();
      const onInvite = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          onInvite={onInvite}
        />,
      );

      const inviteButton = screen.getByText("Invite");
      await user.click(inviteButton);

      expect(onInvite).toHaveBeenCalledOnce();
    });

    it("shows remove button for members with matching invitations when organizer", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      // Jane Smith (inv-2) and Bob Wilson (inv-3) have invitations
      expect(
        screen.getByRole("button", { name: "Remove Jane Smith" }),
      ).toBeDefined();
      expect(
        screen.getByRole("button", { name: "Remove Bob Wilson" }),
      ).toBeDefined();
    });

    it("does NOT show remove button for trip creator (no matching invitation)", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      // John Doe is organizer/creator with no matching invitation
      expect(
        screen.queryByRole("button", { name: "Remove John Doe" }),
      ).toBeNull();
    });

    it("does NOT show remove button for members without phone numbers (no match possible)", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      // Alice Brown has no phoneNumber, so no invitation match
      expect(
        screen.queryByRole("button", { name: "Remove Alice Brown" }),
      ).toBeNull();
    });

    it("does NOT show remove buttons for non-organizers", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(
        screen.queryByRole("button", { name: "Remove Jane Smith" }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Remove Bob Wilson" }),
      ).toBeNull();
    });
  });

  describe("remove member flow", () => {
    it("shows confirmation dialog when remove button is clicked", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      const removeButton = screen.getByRole("button", {
        name: "Remove Jane Smith",
      });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText("Remove member")).toBeDefined();
        expect(
          screen.getByText(/revoke their invitation/),
        ).toBeDefined();
      });

      // Confirm the dialog references the member name
      const dialogDescription = screen.getByText(/revoke their invitation/);
      expect(dialogDescription.textContent).toContain("Jane Smith");
    });

    it("calls revokeInvitation with correct invitationId on confirm", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      const removeButton = screen.getByRole("button", {
        name: "Remove Jane Smith",
      });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText("Remove member")).toBeDefined();
      });

      const confirmButton = screen.getByRole("button", { name: "Remove" });
      await user.click(confirmButton);

      expect(mockRevokeMutate).toHaveBeenCalledWith(
        "inv-2",
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });

    it("closes dialog when cancel is clicked", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      const removeButton = screen.getByRole("button", {
        name: "Remove Jane Smith",
      });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText("Remove member")).toBeDefined();
      });

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText("Remove member")).toBeNull();
      });
    });

    it("shows success toast on successful removal", async () => {
      mockRevokeMutate.mockImplementation(
        (_id: string, options: { onSuccess: () => void }) => {
          options.onSuccess();
        },
      );

      const user = userEvent.setup();
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      const removeButton = screen.getByRole("button", {
        name: "Remove Jane Smith",
      });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText("Remove member")).toBeDefined();
      });

      const confirmButton = screen.getByRole("button", { name: "Remove" });
      await user.click(confirmButton);

      expect(mockToast.success).toHaveBeenCalledWith(
        "Jane Smith has been removed",
      );
    });

    it("shows error toast on failed removal", async () => {
      mockRevokeMutate.mockImplementation(
        (_id: string, options: { onError: (err: Error) => void }) => {
          options.onError(new Error("Permission denied"));
        },
      );

      const user = userEvent.setup();
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      const removeButton = screen.getByRole("button", {
        name: "Remove Jane Smith",
      });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText("Remove member")).toBeDefined();
      });

      const confirmButton = screen.getByRole("button", { name: "Remove" });
      await user.click(confirmButton);

      expect(mockToast.error).toHaveBeenCalledWith("Failed to remove member");
    });
  });

  describe("empty state", () => {
    it("handles empty member list gracefully", () => {
      mockUseMembers.mockReturnValue({
        data: [],
        isPending: false,
      });

      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.getByText("No members yet")).toBeDefined();
    });

    it("shows invite button in empty state for organizers", () => {
      mockUseMembers.mockReturnValue({
        data: [],
        isPending: false,
      });

      const onInvite = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          onInvite={onInvite}
        />,
      );

      expect(screen.getByText("Invite members")).toBeDefined();
    });

    it("does NOT show invite button in empty state for non-organizers", () => {
      mockUseMembers.mockReturnValue({
        data: [],
        isPending: false,
      });

      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.queryByText("Invite members")).toBeNull();
    });
  });

  describe("hook calls", () => {
    it("calls useMembers with correct tripId", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(mockUseMembers).toHaveBeenCalledWith("trip-123");
    });

    it("calls useInvitations with correct tripId", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      expect(mockUseInvitations).toHaveBeenCalledWith("trip-123");
    });

    it("calls useRevokeInvitation with correct tripId", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      expect(mockUseRevokeInvitation).toHaveBeenCalledWith("trip-123");
    });
  });

  describe("styling", () => {
    it("heading uses Playfair font", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      const heading = screen.getByText("Members (4)");
      expect(heading.className).toContain(
        "font-[family-name:var(--font-playfair)]",
      );
    });
  });
});
