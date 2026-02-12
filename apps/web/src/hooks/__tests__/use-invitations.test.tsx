import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useInvitations,
  useMembers,
  useInviteMembers,
  useRevokeInvitation,
  useUpdateRsvp,
  getInviteMembersErrorMessage,
  getRevokeInvitationErrorMessage,
  getUpdateRsvpErrorMessage,
  type Invitation,
  type MemberWithProfile,
} from "../use-invitations";
import { APIError } from "@/lib/api";

// Mock the API module
vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn(),
  APIError: class APIError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
      this.name = "APIError";
    }
  },
}));

const mockInvitations: Invitation[] = [
  {
    id: "inv-1",
    tripId: "trip-123",
    inviterId: "user-1",
    inviteePhone: "+14155551234",
    status: "pending",
    sentAt: "2026-02-06T12:00:00Z",
    respondedAt: null,
    createdAt: "2026-02-06T12:00:00Z",
    updatedAt: "2026-02-06T12:00:00Z",
  },
];

const mockMembers: MemberWithProfile[] = [
  {
    id: "member-1",
    userId: "user-1",
    displayName: "John Doe",
    profilePhotoUrl: "https://example.com/john.jpg",
    status: "going",
    isOrganizer: true,
    createdAt: "2026-02-06T12:00:00Z",
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
    createdAt: "2026-02-06T13:00:00Z",
    handles: null,
  },
];

describe("useInvitations", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("successful invitations fetch", () => {
    it("fetches invitations successfully", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        invitations: mockInvitations,
      });

      const { result } = renderHook(() => useInvitations("trip-123"), {
        wrapper,
      });

      expect(result.current.isPending).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockInvitations);
      expect(apiRequest).toHaveBeenCalledWith(
        "/trips/trip-123/invitations",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("returns empty array when no invitations exist", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        invitations: [],
      });

      const { result } = renderHook(() => useInvitations("trip-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("handles API errors correctly", async () => {
      const { apiRequest } = await import("@/lib/api");
      const apiError = new APIError("UNAUTHORIZED", "Not authenticated");
      vi.mocked(apiRequest).mockRejectedValueOnce(apiError);

      const { result } = renderHook(() => useInvitations("trip-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(apiError);
    });
  });
});

describe("useMembers", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("successful members fetch", () => {
    it("fetches members successfully", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        members: mockMembers,
      });

      const { result } = renderHook(() => useMembers("trip-123"), { wrapper });

      expect(result.current.isPending).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMembers);
      expect(apiRequest).toHaveBeenCalledWith(
        "/trips/trip-123/members",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("returns empty array when no members exist", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        members: [],
      });

      const { result } = renderHook(() => useMembers("trip-123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("handles API errors correctly", async () => {
      const { apiRequest } = await import("@/lib/api");
      const apiError = new APIError("UNAUTHORIZED", "Not authenticated");
      vi.mocked(apiRequest).mockRejectedValueOnce(apiError);

      const { result } = renderHook(() => useMembers("trip-123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(apiError);
    });
  });
});

describe("useInviteMembers", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("successful batch invite", () => {
    it("invites members successfully", async () => {
      const { apiRequest } = await import("@/lib/api");
      const mockResponse = {
        success: true as const,
        invitations: mockInvitations,
        skipped: [],
      };
      vi.mocked(apiRequest).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useInviteMembers("trip-123"), {
        wrapper,
      });

      result.current.mutate({ phoneNumbers: ["+14155551234"] });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiRequest).toHaveBeenCalledWith("/trips/trip-123/invitations", {
        method: "POST",
        body: JSON.stringify({ phoneNumbers: ["+14155551234"] }),
      });
      expect(result.current.data).toEqual(mockResponse);
    });

    it("invalidates invitations and members queries on success", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        invitations: mockInvitations,
        skipped: [],
      });

      queryClient.setQueryData(["invitations", "list", "trip-123"], []);
      queryClient.setQueryData(["members", "list", "trip-123"], []);
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInviteMembers("trip-123"), {
        wrapper,
      });

      result.current.mutate({ phoneNumbers: ["+14155551234"] });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["invitations", "list", "trip-123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["members", "list", "trip-123"],
      });
    });
  });

  describe("error handling", () => {
    it("handles PERMISSION_DENIED error", async () => {
      const { apiRequest } = await import("@/lib/api");
      const apiError = new APIError("PERMISSION_DENIED", "No permission");
      vi.mocked(apiRequest).mockRejectedValueOnce(apiError);

      const { result } = renderHook(() => useInviteMembers("trip-123"), {
        wrapper,
      });

      result.current.mutate({ phoneNumbers: ["+14155551234"] });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(apiError);
    });
  });
});

describe("useRevokeInvitation", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("successful revocation", () => {
    it("revokes an invitation successfully", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useRevokeInvitation("trip-123"), {
        wrapper,
      });

      result.current.mutate("inv-1");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiRequest).toHaveBeenCalledWith("/invitations/inv-1", {
        method: "DELETE",
      });
    });

    it("invalidates invitations and members queries on success", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({ success: true });

      queryClient.setQueryData(
        ["invitations", "list", "trip-123"],
        mockInvitations,
      );
      queryClient.setQueryData(["members", "list", "trip-123"], mockMembers);
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useRevokeInvitation("trip-123"), {
        wrapper,
      });

      result.current.mutate("inv-1");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["invitations", "list", "trip-123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["members", "list", "trip-123"],
      });
    });
  });

  describe("error handling", () => {
    it("handles PERMISSION_DENIED error", async () => {
      const { apiRequest } = await import("@/lib/api");
      const apiError = new APIError("PERMISSION_DENIED", "No permission");
      vi.mocked(apiRequest).mockRejectedValueOnce(apiError);

      const { result } = renderHook(() => useRevokeInvitation("trip-123"), {
        wrapper,
      });

      result.current.mutate("inv-1");

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(apiError);
    });
  });
});

describe("useUpdateRsvp", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("successful RSVP update", () => {
    it("updates RSVP status successfully", async () => {
      const { apiRequest } = await import("@/lib/api");
      const mockMember = mockMembers[0];
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        member: mockMember,
      });

      const { result } = renderHook(() => useUpdateRsvp("trip-123"), {
        wrapper,
      });

      result.current.mutate({ status: "going" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiRequest).toHaveBeenCalledWith("/trips/trip-123/rsvp", {
        method: "POST",
        body: JSON.stringify({ status: "going" }),
      });
      expect(result.current.data).toEqual(mockMember);
    });

    it("invalidates trip detail, trips list, and members queries on success", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        member: mockMembers[0],
      });

      queryClient.setQueryData(["trips", "trip-123"], {});
      queryClient.setQueryData(["trips"], []);
      queryClient.setQueryData(["members", "list", "trip-123"], mockMembers);
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useUpdateRsvp("trip-123"), {
        wrapper,
      });

      result.current.mutate({ status: "maybe" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["trips", "trip-123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["trips"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["members", "list", "trip-123"],
      });
    });
  });

  describe("error handling", () => {
    it("handles PERMISSION_DENIED error", async () => {
      const { apiRequest } = await import("@/lib/api");
      const apiError = new APIError("PERMISSION_DENIED", "No permission");
      vi.mocked(apiRequest).mockRejectedValueOnce(apiError);

      const { result } = renderHook(() => useUpdateRsvp("trip-123"), {
        wrapper,
      });

      result.current.mutate({ status: "going" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(apiError);
    });
  });
});

describe("error message helpers", () => {
  describe("getInviteMembersErrorMessage", () => {
    it("returns null for no error", () => {
      expect(getInviteMembersErrorMessage(null)).toBe(null);
    });

    it("handles PERMISSION_DENIED", () => {
      const error = new APIError("PERMISSION_DENIED", "No permission");
      expect(getInviteMembersErrorMessage(error)).toBe(
        "You don't have permission to invite members to this trip.",
      );
    });

    it("handles MEMBER_LIMIT_EXCEEDED", () => {
      const error = new APIError(
        "MEMBER_LIMIT_EXCEEDED",
        "Member limit exceeded",
      );
      expect(getInviteMembersErrorMessage(error)).toBe(
        "Cannot invite more members: the trip has reached the maximum member limit.",
      );
    });

    it("handles VALIDATION_ERROR", () => {
      const error = new APIError("VALIDATION_ERROR", "Invalid data");
      expect(getInviteMembersErrorMessage(error)).toBe(
        "Please check your input and try again.",
      );
    });

    it("handles UNAUTHORIZED", () => {
      const error = new APIError("UNAUTHORIZED", "Not authenticated");
      expect(getInviteMembersErrorMessage(error)).toBe(
        "You must be logged in to invite members.",
      );
    });

    it("handles unknown APIError codes", () => {
      const error = new APIError("UNKNOWN_ERROR", "Something went wrong");
      expect(getInviteMembersErrorMessage(error)).toBe("Something went wrong");
    });

    it("handles network errors", () => {
      const error = new Error("fetch failed");
      expect(getInviteMembersErrorMessage(error)).toBe(
        "Network error: Please check your connection and try again.",
      );
    });

    it("handles generic errors", () => {
      const error = new Error("Something unexpected happened");
      expect(getInviteMembersErrorMessage(error)).toBe(
        "An unexpected error occurred. Please try again.",
      );
    });
  });

  describe("getRevokeInvitationErrorMessage", () => {
    it("returns null for no error", () => {
      expect(getRevokeInvitationErrorMessage(null)).toBe(null);
    });

    it("handles PERMISSION_DENIED", () => {
      const error = new APIError("PERMISSION_DENIED", "No permission");
      expect(getRevokeInvitationErrorMessage(error)).toBe(
        "You don't have permission to revoke this invitation.",
      );
    });

    it("handles INVITATION_NOT_FOUND", () => {
      const error = new APIError(
        "INVITATION_NOT_FOUND",
        "Invitation not found",
      );
      expect(getRevokeInvitationErrorMessage(error)).toBe(
        "Invitation not found.",
      );
    });

    it("handles UNAUTHORIZED", () => {
      const error = new APIError("UNAUTHORIZED", "Not authenticated");
      expect(getRevokeInvitationErrorMessage(error)).toBe(
        "You must be logged in to revoke an invitation.",
      );
    });

    it("handles network errors", () => {
      const error = new Error("fetch failed");
      expect(getRevokeInvitationErrorMessage(error)).toBe(
        "Network error: Please check your connection and try again.",
      );
    });

    it("handles generic errors", () => {
      const error = new Error("Something unexpected happened");
      expect(getRevokeInvitationErrorMessage(error)).toBe(
        "An unexpected error occurred. Please try again.",
      );
    });
  });

  describe("getUpdateRsvpErrorMessage", () => {
    it("returns null for no error", () => {
      expect(getUpdateRsvpErrorMessage(null)).toBe(null);
    });

    it("handles PERMISSION_DENIED", () => {
      const error = new APIError("PERMISSION_DENIED", "No permission");
      expect(getUpdateRsvpErrorMessage(error)).toBe(
        "You don't have permission to update your RSVP for this trip.",
      );
    });

    it("handles NOT_FOUND", () => {
      const error = new APIError("NOT_FOUND", "Trip not found");
      expect(getUpdateRsvpErrorMessage(error)).toBe("Trip not found.");
    });

    it("handles VALIDATION_ERROR", () => {
      const error = new APIError("VALIDATION_ERROR", "Invalid data");
      expect(getUpdateRsvpErrorMessage(error)).toBe(
        "Please check your input and try again.",
      );
    });

    it("handles UNAUTHORIZED", () => {
      const error = new APIError("UNAUTHORIZED", "Not authenticated");
      expect(getUpdateRsvpErrorMessage(error)).toBe(
        "You must be logged in to update your RSVP.",
      );
    });

    it("handles network errors", () => {
      const error = new Error("fetch failed");
      expect(getUpdateRsvpErrorMessage(error)).toBe(
        "Network error: Please check your connection and try again.",
      );
    });

    it("handles generic errors", () => {
      const error = new Error("Something unexpected happened");
      expect(getUpdateRsvpErrorMessage(error)).toBe(
        "An unexpected error occurred. Please try again.",
      );
    });
  });
});
