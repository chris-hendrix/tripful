import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock server API
const mockServerApiRequest = vi.fn();
vi.mock("@/lib/server-api", () => ({
  serverApiRequest: (...args: unknown[]) => mockServerApiRequest(...args),
}));

// Mock query client
const mockSetQueryData = vi.fn();
vi.mock("@/lib/get-query-client", () => ({
  getQueryClient: () => ({
    setQueryData: mockSetQueryData,
  }),
}));

// Mock TanStack Query — preserve real exports (queryOptions used by trip-queries.ts)
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    dehydrate: vi.fn(() => ({ queries: [] })),
    HydrationBoundary: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="hydration-boundary">{children}</div>
    ),
  };
});

// Mock TripDetailContent
vi.mock("./trip-detail-content", () => ({
  TripDetailContent: ({ tripId }: { tripId: string }) => (
    <div data-testid="trip-detail-content" data-trip-id={tripId} />
  ),
}));

// Import AFTER mocks
import TripDetailPage, { generateMetadata } from "./page";

const mockTripResponse = {
  success: true as const,
  trip: {
    id: "trip-123",
    name: "Beach Trip",
    destination: "Hawaii",
    startDate: null,
    endDate: null,
    preferredTimezone: "Pacific/Honolulu",
    description: null,
    coverImageUrl: null,
    createdBy: "user-1",
    allowMembersToAddEvents: true,
    cancelled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    organizers: [],
    memberCount: 1,
  },
};

describe("TripDetailPage (RSC)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awaits params and prefetches trip detail", async () => {
    mockServerApiRequest.mockResolvedValue(mockTripResponse);

    const result = await TripDetailPage({
      params: Promise.resolve({ id: "trip-123" }),
    });
    render(result as React.ReactElement);

    expect(mockServerApiRequest).toHaveBeenCalledWith("/trips/trip-123");
    expect(mockSetQueryData).toHaveBeenCalledWith(
      ["trips", "trip-123"],
      mockTripResponse.trip,
    );
  });

  it("renders HydrationBoundary with TripDetailContent even when prefetch fails", async () => {
    mockServerApiRequest.mockRejectedValue(new Error("Server error"));

    const result = await TripDetailPage({
      params: Promise.resolve({ id: "trip-456" }),
    });
    const { getByTestId } = render(result as React.ReactElement);

    expect(getByTestId("hydration-boundary")).toBeDefined();
    expect(getByTestId("trip-detail-content")).toBeDefined();
    expect(
      getByTestId("trip-detail-content").getAttribute("data-trip-id"),
    ).toBe("trip-456");
    expect(mockSetQueryData).not.toHaveBeenCalled();
  });

  it("does not throw when prefetch fails", async () => {
    mockServerApiRequest.mockRejectedValue(new Error("Network error"));

    await expect(
      TripDetailPage({ params: Promise.resolve({ id: "trip-789" }) }),
    ).resolves.not.toThrow();
  });

  it("passes tripId from params to TripDetailContent", async () => {
    mockServerApiRequest.mockResolvedValue(mockTripResponse);

    const result = await TripDetailPage({
      params: Promise.resolve({ id: "trip-abc" }),
    });
    const { getByTestId } = render(result as React.ReactElement);

    expect(
      getByTestId("trip-detail-content").getAttribute("data-trip-id"),
    ).toBe("trip-abc");
  });
});

describe("generateMetadata", () => {
  it("returns title with trip ID", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "trip-123" }),
    });
    expect(metadata).toEqual({ title: "Trip trip-123" });
  });
});
