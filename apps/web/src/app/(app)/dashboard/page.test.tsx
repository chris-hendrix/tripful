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

// Mock DashboardContent
vi.mock("./dashboard-content", () => ({
  DashboardContent: () => <div data-testid="dashboard-content" />,
}));

// Import AFTER mocks
import DashboardPage, { metadata } from "./page";

const mockTripsResponse = {
  data: [
    {
      id: "trip-1",
      name: "Beach Trip",
      destination: "Hawaii",
      startDate: null,
      endDate: null,
      coverImageUrl: null,
      isOrganizer: true,
      rsvpStatus: "going" as const,
      organizerInfo: [],
      memberCount: 1,
      eventCount: 0,
    },
  ],
  meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
};

describe("DashboardPage (RSC)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches trips and populates query cache on success", async () => {
    mockServerApiRequest.mockResolvedValue(mockTripsResponse);

    const result = await DashboardPage();
    render(result as React.ReactElement);

    expect(mockServerApiRequest).toHaveBeenCalledWith("/trips");
    expect(mockSetQueryData).toHaveBeenCalledWith(
      ["trips"],
      mockTripsResponse.data,
    );
  });

  it("renders HydrationBoundary with DashboardContent even when prefetch fails", async () => {
    mockServerApiRequest.mockRejectedValue(new Error("Server error"));

    const result = await DashboardPage();
    const { getByTestId } = render(result as React.ReactElement);

    expect(getByTestId("hydration-boundary")).toBeDefined();
    expect(getByTestId("dashboard-content")).toBeDefined();
    expect(mockSetQueryData).not.toHaveBeenCalled();
  });

  it("does not throw when prefetch fails", async () => {
    mockServerApiRequest.mockRejectedValue(new Error("Network error"));

    await expect(DashboardPage()).resolves.not.toThrow();
  });

  it("exports metadata with correct title", () => {
    expect(metadata).toEqual({ title: "Dashboard" });
  });
});
