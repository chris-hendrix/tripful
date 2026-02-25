"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  mutualKeys,
  mutualsQueryOptions,
  mutualSuggestionsQueryOptions,
} from "./mutuals-queries";

// Re-export keys and options for convenience
export { mutualKeys, mutualsQueryOptions, mutualSuggestionsQueryOptions };

/**
 * Hook for fetching paginated mutuals with optional search and trip filter
 *
 * Uses cursor-based infinite pagination.
 *
 * @param params - Optional filter parameters (search, tripId)
 * @returns Infinite query object with pages of mutuals
 */
export function useMutuals(params?: { tripId?: string | undefined; search?: string | undefined }) {
  return useInfiniteQuery(mutualsQueryOptions(params));
}

/**
 * Hook for fetching mutual suggestions for a trip
 *
 * Returns mutuals who are not yet members of the specified trip.
 *
 * @param tripId - The ID of the trip to get suggestions for
 * @returns Query object with mutual suggestions
 */
export function useMutualSuggestions(tripId: string) {
  return useQuery(mutualSuggestionsQueryOptions(tripId));
}
