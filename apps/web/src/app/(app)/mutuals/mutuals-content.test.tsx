import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, type ReactNode } from "react";
import { MutualsContent } from "./mutuals-content";

// Mock hooks
const mockUseMutuals = vi.fn();
vi.mock("@/hooks/use-mutuals", () => ({
  useMutuals: (...args: unknown[]) => mockUseMutuals(...args),
  mutualKeys: {
    all: ["mutuals"],
    lists: () => ["mutuals", "list"],
    list: (p: unknown) => ["mutuals", "list", p],
  },
}));

const mockUseTrips = vi.fn();
vi.mock("@/hooks/use-trips", () => ({
  useTrips: () => mockUseTrips(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/mutuals",
}));

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: mockObserve,
    unobserve: vi.fn(),
    disconnect: mockDisconnect,
  })) as unknown as typeof IntersectionObserver;
});

describe("MutualsContent", () => {
  let queryClient: QueryClient;

  const mockMutuals = [
    {
      id: "user-1",
      displayName: "Alice Johnson",
      profilePhotoUrl: "https://example.com/alice.jpg",
      sharedTripCount: 3,
      sharedTrips: [
        { id: "trip-1", name: "Summer Vacation" },
        { id: "trip-2", name: "Ski Weekend" },
        { id: "trip-3", name: "Beach Party" },
      ],
    },
    {
      id: "user-2",
      displayName: "Bob Smith",
      profilePhotoUrl: null,
      sharedTripCount: 1,
      sharedTrips: [{ id: "trip-1", name: "Summer Vacation" }],
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.clearAllMocks();

    // Default: trips hook returns empty
    mockUseTrips.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithClient = (component: ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>{component}</Suspense>
      </QueryClientProvider>,
    );
  };

  describe("Loading state", () => {
    it("shows loading skeletons while fetching mutuals", () => {
      mockUseMutuals.mockReturnValue({
        data: undefined,
        isPending: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: true,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
      });

      renderWithClient(<MutualsContent />);

      // Should show skeleton cards
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("does not show mutual count during loading", () => {
      mockUseMutuals.mockReturnValue({
        data: undefined,
        isPending: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: true,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
      });

      renderWithClient(<MutualsContent />);

      expect(screen.queryByText(/\d+ mutuals?/)).toBeNull();
    });
  });

  describe("Mutuals display", () => {
    it("renders mutuals grid when data loaded", () => {
      mockUseMutuals.mockReturnValue({
        data: {
          pages: [{ success: true, mutuals: mockMutuals, nextCursor: null }],
          pageParams: [undefined],
        },
        isPending: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
      });

      renderWithClient(<MutualsContent />);

      expect(screen.getByText("My Mutuals")).toBeDefined();
      expect(screen.getByText("2 mutuals")).toBeDefined();
      expect(screen.getByText("Alice Johnson")).toBeDefined();
      expect(screen.getByText("Bob Smith")).toBeDefined();
      expect(screen.getByText("3 shared trips")).toBeDefined();
      expect(screen.getByText("1 shared trip")).toBeDefined();
    });

    it("shows singular 'mutual' for one mutual", () => {
      mockUseMutuals.mockReturnValue({
        data: {
          pages: [
            {
              success: true,
              mutuals: [mockMutuals[0]],
              nextCursor: null,
            },
          ],
          pageParams: [undefined],
        },
        isPending: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
      });

      renderWithClient(<MutualsContent />);

      expect(screen.getByText("1 mutual")).toBeDefined();
    });
  });

  describe("Empty state", () => {
    it("renders empty state when no mutuals", () => {
      mockUseMutuals.mockReturnValue({
        data: {
          pages: [{ success: true, mutuals: [], nextCursor: null }],
          pageParams: [undefined],
        },
        isPending: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
      });

      renderWithClient(<MutualsContent />);

      expect(screen.getByText("No mutuals yet")).toBeDefined();
      expect(
        screen.getByText(
          "Mutuals are people who share trips with you. Start a trip and invite friends to see them here.",
        ),
      ).toBeDefined();
    });
  });

  describe("Error state", () => {
    it("displays error state with retry button", () => {
      const mockRefetch = vi.fn();
      mockUseMutuals.mockReturnValue({
        data: undefined,
        isPending: false,
        isError: true,
        error: new Error("Network error"),
        refetch: mockRefetch,
        isFetching: false,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
      });

      renderWithClient(<MutualsContent />);

      expect(screen.getByText("Failed to load mutuals")).toBeDefined();
      expect(screen.getByText("Network error")).toBeDefined();
      expect(screen.getByText("Try again")).toBeDefined();
    });

    it("calls refetch when retry button is clicked", async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      mockUseMutuals.mockReturnValue({
        data: undefined,
        isPending: false,
        isError: true,
        error: new Error("Network error"),
        refetch: mockRefetch,
        isFetching: false,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
      });

      renderWithClient(<MutualsContent />);

      const retryButton = screen.getByText("Try again");
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledOnce();
    });
  });

  describe("Search functionality", () => {
    it("search input filters with debounce", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({
        advanceTimers: vi.advanceTimersByTime,
      });

      mockUseMutuals.mockReturnValue({
        data: {
          pages: [{ success: true, mutuals: mockMutuals, nextCursor: null }],
          pageParams: [undefined],
        },
        isPending: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
      });

      renderWithClient(<MutualsContent />);

      const searchInput = screen.getByPlaceholderText("Search mutuals...");
      await user.type(searchInput, "Alice");

      // Before debounce, should still be called without search
      expect(mockUseMutuals).toHaveBeenCalledWith({
        search: undefined,
        tripId: undefined,
      });

      // Advance past the 300ms debounce
      vi.advanceTimersByTime(300);

      // After debounce, should be called with search param
      await waitFor(() => {
        expect(mockUseMutuals).toHaveBeenCalledWith({
          search: "Alice",
          tripId: undefined,
        });
      });

      vi.useRealTimers();
    });
  });
});
