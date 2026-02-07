import { queryOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { GetTripsResponse, GetTripResponse } from "@tripful/shared/types";

/**
 * Query key factory for trip-related queries
 */
export const tripKeys = {
  all: ["trips"] as const,
  detail: (id: string) => ["trips", id] as const,
  create: () => ["trips", "create"] as const,
  update: () => ["trips", "update"] as const,
  cancel: () => ["trips", "cancel"] as const,
};

/**
 * Query options for fetching all trips
 */
export const tripsQueryOptions = queryOptions({
  queryKey: tripKeys.all,
  queryFn: async ({ signal }) => {
    const response = await apiRequest<GetTripsResponse>("/trips", { signal });
    return response.data;
  },
});

/**
 * Query options factory for fetching a single trip's details
 */
export const tripDetailQueryOptions = (tripId: string) =>
  queryOptions({
    queryKey: tripKeys.detail(tripId),
    queryFn: async ({ signal }) => {
      const response = await apiRequest<GetTripResponse>(`/trips/${tripId}`, {
        signal,
      });
      return response.trip;
    },
    enabled: !!tripId,
  });
