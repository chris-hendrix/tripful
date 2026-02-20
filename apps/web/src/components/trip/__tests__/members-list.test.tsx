import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MembersList } from "../members-list";
import type { MemberWithProfile } from "@/hooks/use-invitations";

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

vi.mock("@/hooks/use-invitations", () => ({
  useMembers: (tripId: string) => mockUseMembers(tripId),
}));

const mockMuteMember = {
  mutateAsync: vi.fn().mockResolvedValue({ success: true }),
  isPending: false,
};
const mockUnmuteMember = {
  mutateAsync: vi.fn().mockResolvedValue({ success: true }),
  isPending: false,
};

vi.mock("@/hooks/use-messages", () => ({
  useMuteMember: () => mockMuteMember,
  useUnmuteMember: () => mockUnmuteMember,
  getMuteMemberErrorMessage: () => "Failed to mute member",
  getUnmuteMemberErrorMessage: () => "Failed to unmute member",
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
    handles: null,
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
    handles: null,
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
    handles: null,
  },
  {
    id: "member-4",
    userId: "user-4",
    displayName: "Alice Brown",
    profilePhotoUrl: null,
    status: "no_response",
    isOrganizer: false,
    createdAt: "2026-01-04T00:00:00Z",
    handles: null,
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

      const goingBadge = screen
        .getByText("Going")
        .closest("[data-slot='badge']");
      expect(goingBadge).not.toBeNull();
      expect(goingBadge!.className).toContain("bg-success/15");
      expect(goingBadge!.className).toContain("text-success");
    });

    it("Maybe badge uses correct color classes", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      const maybeBadge = screen
        .getByText("Maybe")
        .closest("[data-slot='badge']");
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
          handles: null,
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

  describe("phone number display", () => {
    it("shows phone numbers when phoneNumber is present in the data", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      expect(screen.getByText("+14155551234")).toBeDefined();
      expect(screen.getByText("+14155555678")).toBeDefined();
      expect(screen.getByText("+14155559999")).toBeDefined();
    });

    it("shows phone numbers for non-organizers when phoneNumber is present", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      // API now handles phone filtering server-side, so phones render
      // whenever phoneNumber is present in the data regardless of isOrganizer
      expect(screen.getByText("+14155551234")).toBeDefined();
      expect(screen.getByText("+14155555678")).toBeDefined();
      expect(screen.getByText("+14155559999")).toBeDefined();
    });

    it("does NOT show phone numbers when phoneNumber is absent from the data", () => {
      const membersWithoutPhone: MemberWithProfile[] = [
        {
          id: "member-1",
          userId: "user-1",
          displayName: "John Doe",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: true,
          createdAt: "2026-01-01T00:00:00Z",
          handles: null,
        },
        {
          id: "member-2",
          userId: "user-2",
          displayName: "Jane Smith",
          profilePhotoUrl: null,
          status: "maybe",
          isOrganizer: false,
          createdAt: "2026-01-02T00:00:00Z",
          handles: null,
        },
      ];

      mockUseMembers.mockReturnValue({
        data: membersWithoutPhone,
        isPending: false,
      });

      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.queryByText("+14155551234")).toBeNull();
      expect(screen.queryByText("+14155555678")).toBeNull();
    });
  });

  describe("organizer-only features", () => {
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

    it("shows actions dropdown for non-creator members when organizer and onRemove provided", () => {
      const onRemove = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          onRemove={onRemove}
        />,
      );

      // Jane Smith, Bob Wilson, and Alice Brown are non-creators
      expect(
        screen.getByRole("button", { name: "Actions for Jane Smith" }),
      ).toBeDefined();
      expect(
        screen.getByRole("button", { name: "Actions for Bob Wilson" }),
      ).toBeDefined();
      expect(
        screen.getByRole("button", { name: "Actions for Alice Brown" }),
      ).toBeDefined();
    });

    it("shows actions dropdown for non-organizer non-creator members even without onRemove/onUpdateRole (mute is available)", () => {
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
        />,
      );

      // Jane Smith (non-organizer, non-creator) shows actions because canMute is true
      expect(
        screen.getByRole("button", { name: "Actions for Jane Smith" }),
      ).toBeDefined();
    });

    it("does NOT show actions dropdown for trip creator", () => {
      const onRemove = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          onRemove={onRemove}
        />,
      );

      // John Doe (user-1) is the creator
      expect(
        screen.queryByRole("button", { name: "Actions for John Doe" }),
      ).toBeNull();
    });

    it("does NOT show actions dropdown for non-organizers", () => {
      const onRemove = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={false}
          createdBy="user-1"
          onRemove={onRemove}
        />,
      );

      expect(
        screen.queryByRole("button", { name: "Actions for Jane Smith" }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Actions for Bob Wilson" }),
      ).toBeNull();
    });
  });

  describe("remove member flow", () => {
    it("calls onRemove with member when remove from trip is clicked in dropdown", async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          onRemove={onRemove}
        />,
      );

      const actionsButton = screen.getByRole("button", {
        name: "Actions for Jane Smith",
      });
      await user.click(actionsButton);

      const removeItem = await screen.findByText("Remove from trip");
      await user.click(removeItem);

      expect(onRemove).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "member-2",
          displayName: "Jane Smith",
        }),
      );
    });

    it("calls onRemove with correct member for different members", async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          onRemove={onRemove}
        />,
      );

      const actionsButton = screen.getByRole("button", {
        name: "Actions for Bob Wilson",
      });
      await user.click(actionsButton);

      const removeItem = await screen.findByText("Remove from trip");
      await user.click(removeItem);

      expect(onRemove).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "member-3",
          displayName: "Bob Wilson",
        }),
      );
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
  });

  describe("co-organizer role management", () => {
    it("shows dropdown menu with promote option for regular member when organizer views", async () => {
      const user = userEvent.setup();
      const onUpdateRole = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          currentUserId="user-1"
          onUpdateRole={onUpdateRole}
        />,
      );

      // Jane Smith (user-2) is a regular member, not creator, not current user
      const actionsButton = screen.getByRole("button", {
        name: "Actions for Jane Smith",
      });
      await user.click(actionsButton);

      expect(await screen.findByText("Make co-organizer")).toBeDefined();
    });

    it("shows dropdown menu with demote option for co-organizer member when organizer views", async () => {
      // Set up a co-organizer member (not creator, not current user)
      const membersWithCoOrg: MemberWithProfile[] = [
        {
          id: "member-1",
          userId: "user-1",
          displayName: "John Doe",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: true,
          createdAt: "2026-01-01T00:00:00Z",
          handles: null,
        },
        {
          id: "member-2",
          userId: "user-2",
          displayName: "Jane Smith",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: true,
          createdAt: "2026-01-02T00:00:00Z",
          handles: null,
        },
      ];

      mockUseMembers.mockReturnValue({
        data: membersWithCoOrg,
        isPending: false,
      });

      const user = userEvent.setup();
      const onUpdateRole = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          currentUserId="user-1"
          onUpdateRole={onUpdateRole}
        />,
      );

      // Jane Smith (user-2) is a co-organizer, not creator
      const actionsButton = screen.getByRole("button", {
        name: "Actions for Jane Smith",
      });
      await user.click(actionsButton);

      expect(await screen.findByText("Remove co-organizer")).toBeDefined();
    });

    it("does not show dropdown for trip creator", () => {
      const onUpdateRole = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          currentUserId="user-1"
          onUpdateRole={onUpdateRole}
        />,
      );

      // John Doe (user-1) is the creator - no actions dropdown
      expect(
        screen.queryByRole("button", { name: "Actions for John Doe" }),
      ).toBeNull();
    });

    it("does not show dropdown for current user", () => {
      const onUpdateRole = vi.fn();

      // Only provide onUpdateRole (not onRemove), so the only reason to show
      // actions is role management. Since current user cannot change own role,
      // no dropdown should show for them.
      const membersWithCurrentUser: MemberWithProfile[] = [
        {
          id: "member-5",
          userId: "user-5",
          displayName: "Current User",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: true,
          createdAt: "2026-01-01T00:00:00Z",
          handles: null,
        },
        {
          id: "member-2",
          userId: "user-2",
          displayName: "Jane Smith",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: false,
          createdAt: "2026-01-02T00:00:00Z",
          handles: null,
        },
      ];

      mockUseMembers.mockReturnValue({
        data: membersWithCurrentUser,
        isPending: false,
      });

      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-99"
          currentUserId="user-5"
          onUpdateRole={onUpdateRole}
        />,
      );

      // Current user (user-5) should not have actions for role update
      // (canUpdateRole is false because member.userId === currentUserId)
      // And no onRemove provided, so canRemove is also false
      expect(
        screen.queryByRole("button", { name: "Actions for Current User" }),
      ).toBeNull();
    });

    it("calls onUpdateRole with correct args when promote clicked", async () => {
      const user = userEvent.setup();
      const onUpdateRole = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          currentUserId="user-1"
          onUpdateRole={onUpdateRole}
        />,
      );

      const actionsButton = screen.getByRole("button", {
        name: "Actions for Jane Smith",
      });
      await user.click(actionsButton);

      const promoteItem = await screen.findByText("Make co-organizer");
      await user.click(promoteItem);

      expect(onUpdateRole).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "member-2",
          userId: "user-2",
          displayName: "Jane Smith",
        }),
        true,
      );
    });

    it("calls onUpdateRole with correct args when demote clicked", async () => {
      const membersWithCoOrg: MemberWithProfile[] = [
        {
          id: "member-1",
          userId: "user-1",
          displayName: "John Doe",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: true,
          createdAt: "2026-01-01T00:00:00Z",
          handles: null,
        },
        {
          id: "member-2",
          userId: "user-2",
          displayName: "Jane Smith",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: true,
          createdAt: "2026-01-02T00:00:00Z",
          handles: null,
        },
      ];

      mockUseMembers.mockReturnValue({
        data: membersWithCoOrg,
        isPending: false,
      });

      const user = userEvent.setup();
      const onUpdateRole = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          currentUserId="user-1"
          onUpdateRole={onUpdateRole}
        />,
      );

      const actionsButton = screen.getByRole("button", {
        name: "Actions for Jane Smith",
      });
      await user.click(actionsButton);

      const demoteItem = await screen.findByText("Remove co-organizer");
      await user.click(demoteItem);

      expect(onUpdateRole).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "member-2",
          userId: "user-2",
          displayName: "Jane Smith",
        }),
        false,
      );
    });

    it("shows both role and remove actions in dropdown", async () => {
      const user = userEvent.setup();
      const onUpdateRole = vi.fn();
      const onRemove = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          currentUserId="user-1"
          onUpdateRole={onUpdateRole}
          onRemove={onRemove}
        />,
      );

      const actionsButton = screen.getByRole("button", {
        name: "Actions for Jane Smith",
      });
      await user.click(actionsButton);

      // Both role action and remove action should be present
      expect(await screen.findByText("Make co-organizer")).toBeDefined();
      expect(screen.getByText("Remove from trip")).toBeDefined();

      // Separator should exist between role and remove actions
      const separator = document.querySelector(
        "[data-slot='dropdown-menu-separator']",
      );
      expect(separator).not.toBeNull();
    });
  });

  describe("mute/unmute controls", () => {
    it("shows Muted badge for muted members", () => {
      const membersWithMuted: MemberWithProfile[] = [
        {
          id: "member-1",
          userId: "user-1",
          displayName: "John Doe",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: true,
          createdAt: "2026-01-01T00:00:00Z",
          handles: null,
        },
        {
          id: "member-2",
          userId: "user-2",
          displayName: "Jane Smith",
          profilePhotoUrl: null,
          status: "maybe",
          isOrganizer: false,
          isMuted: true,
          createdAt: "2026-01-02T00:00:00Z",
          handles: null,
        },
      ];

      mockUseMembers.mockReturnValue({
        data: membersWithMuted,
        isPending: false,
      });

      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      expect(screen.getByText("Muted")).toBeDefined();
    });

    it("does not show Muted badge for non-muted members", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={true} />,
      );

      expect(screen.queryByText("Muted")).toBeNull();
    });

    it("shows Mute option for non-organizer member when organizer views", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          currentUserId="user-1"
        />,
      );

      // Jane Smith (user-2) is a regular member, not creator
      const actionsButton = screen.getByRole("button", {
        name: "Actions for Jane Smith",
      });
      await user.click(actionsButton);

      expect(await screen.findByText("Mute")).toBeDefined();
    });

    it("shows Unmute option for muted member when organizer views", async () => {
      const membersWithMuted: MemberWithProfile[] = [
        {
          id: "member-1",
          userId: "user-1",
          displayName: "John Doe",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: true,
          createdAt: "2026-01-01T00:00:00Z",
          handles: null,
        },
        {
          id: "member-2",
          userId: "user-2",
          displayName: "Jane Smith",
          profilePhotoUrl: null,
          status: "maybe",
          isOrganizer: false,
          isMuted: true,
          createdAt: "2026-01-02T00:00:00Z",
          handles: null,
        },
      ];

      mockUseMembers.mockReturnValue({
        data: membersWithMuted,
        isPending: false,
      });

      const user = userEvent.setup();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          currentUserId="user-1"
        />,
      );

      const actionsButton = screen.getByRole("button", {
        name: "Actions for Jane Smith",
      });
      await user.click(actionsButton);

      expect(await screen.findByText("Unmute")).toBeDefined();
    });

    it("does not show Mute/Unmute for organizer member", async () => {
      const membersWithCoOrg: MemberWithProfile[] = [
        {
          id: "member-1",
          userId: "user-1",
          displayName: "John Doe",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: true,
          createdAt: "2026-01-01T00:00:00Z",
          handles: null,
        },
        {
          id: "member-2",
          userId: "user-2",
          displayName: "Jane Smith",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: true,
          createdAt: "2026-01-02T00:00:00Z",
          handles: null,
        },
      ];

      mockUseMembers.mockReturnValue({
        data: membersWithCoOrg,
        isPending: false,
      });

      const user = userEvent.setup();
      const onUpdateRole = vi.fn();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          currentUserId="user-1"
          onUpdateRole={onUpdateRole}
        />,
      );

      // Jane Smith is a co-organizer - should have actions for role but not mute
      const actionsButton = screen.getByRole("button", {
        name: "Actions for Jane Smith",
      });
      await user.click(actionsButton);

      await screen.findByText("Remove co-organizer");
      expect(screen.queryByText("Mute")).toBeNull();
      expect(screen.queryByText("Unmute")).toBeNull();
    });

    it("does not show Mute/Unmute when viewer is not organizer", () => {
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={false}
          createdBy="user-1"
          currentUserId="user-5"
        />,
      );

      // No actions dropdown at all for non-organizers
      expect(
        screen.queryByRole("button", { name: "Actions for Jane Smith" }),
      ).toBeNull();
    });

    it("shows confirmation dialog when Mute is clicked", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          currentUserId="user-1"
        />,
      );

      const actionsButton = screen.getByRole("button", {
        name: "Actions for Jane Smith",
      });
      await user.click(actionsButton);

      const muteItem = await screen.findByText("Mute");
      await user.click(muteItem);

      // Confirmation dialog should appear
      expect(
        await screen.findByText("Mute Jane Smith?"),
      ).toBeDefined();
      expect(
        screen.getByText(
          "This member will not be able to post messages in the trip discussion. You can unmute them at any time.",
        ),
      ).toBeDefined();
    });

    it("calls muteMember with correct userId when mute is confirmed", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          currentUserId="user-1"
        />,
      );

      const actionsButton = screen.getByRole("button", {
        name: "Actions for Jane Smith",
      });
      await user.click(actionsButton);

      const muteItem = await screen.findByText("Mute");
      await user.click(muteItem);

      // Click the Mute button in the confirmation dialog
      const confirmButtons = await screen.findAllByText("Mute");
      // The dialog action button should be the last one (inside AlertDialogAction)
      const confirmButton = confirmButtons[confirmButtons.length - 1]!;
      await user.click(confirmButton);

      expect(mockMuteMember.mutateAsync).toHaveBeenCalledWith("user-2");
    });

    it("calls unmuteMember directly without confirmation dialog", async () => {
      const membersWithMuted: MemberWithProfile[] = [
        {
          id: "member-1",
          userId: "user-1",
          displayName: "John Doe",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: true,
          createdAt: "2026-01-01T00:00:00Z",
          handles: null,
        },
        {
          id: "member-2",
          userId: "user-2",
          displayName: "Jane Smith",
          profilePhotoUrl: null,
          status: "maybe",
          isOrganizer: false,
          isMuted: true,
          createdAt: "2026-01-02T00:00:00Z",
          handles: null,
        },
      ];

      mockUseMembers.mockReturnValue({
        data: membersWithMuted,
        isPending: false,
      });

      const user = userEvent.setup();
      renderWithQueryClient(
        <MembersList
          tripId="trip-123"
          isOrganizer={true}
          createdBy="user-1"
          currentUserId="user-1"
        />,
      );

      const actionsButton = screen.getByRole("button", {
        name: "Actions for Jane Smith",
      });
      await user.click(actionsButton);

      const unmuteItem = await screen.findByText("Unmute");
      await user.click(unmuteItem);

      // Unmute should be called directly without dialog
      expect(mockUnmuteMember.mutateAsync).toHaveBeenCalledWith("user-2");
    });
  });

  describe("Venmo icon link", () => {
    it("renders Venmo link with SVG icon when member has venmo handle", () => {
      const membersWithVenmo: MemberWithProfile[] = [
        {
          id: "member-1",
          userId: "user-1",
          displayName: "John Doe",
          profilePhotoUrl: null,
          status: "going",
          isOrganizer: false,
          createdAt: "2026-01-01T00:00:00Z",
          handles: { venmo: "@testuser" },
        },
      ];

      mockUseMembers.mockReturnValue({
        data: membersWithVenmo,
        isPending: false,
      });

      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      const venmoLink = screen.getByTestId("member-venmo-user-1");
      expect(venmoLink).toBeDefined();
      expect(venmoLink.getAttribute("href")).toBe(
        "https://venmo.com/testuser",
      );
      expect(venmoLink.getAttribute("target")).toBe("_blank");

      // VenmoIcon renders an SVG with aria-hidden="true"
      const svg = venmoLink.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg!.getAttribute("aria-hidden")).toBe("true");
    });

    it("does not render Venmo link when member has no handles", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      expect(screen.queryByTestId("member-venmo-user-1")).toBeNull();
      expect(screen.queryByTestId("member-venmo-user-2")).toBeNull();
    });
  });

  describe("member row padding", () => {
    it("uses consistent py-3 padding without first:pt-0 or last:pb-0 overrides", () => {
      renderWithQueryClient(
        <MembersList tripId="trip-123" isOrganizer={false} />,
      );

      const memberRows = document.querySelectorAll(".py-3");
      expect(memberRows.length).toBe(4);

      memberRows.forEach((row) => {
        expect(row.className).not.toContain("first:pt-0");
        expect(row.className).not.toContain("last:pb-0");
      });
    });
  });
});
