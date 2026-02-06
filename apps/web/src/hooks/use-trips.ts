import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiRequest, APIError } from "@/lib/api";
import type { CreateTripInput, UpdateTripInput } from "@tripful/shared/schemas";

/**
 * Trip type from database schema
 * Matches the Trip type from apps/api/src/db/schema/index.ts
 */
export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  preferredTimezone: string;
  description: string | null;
  coverImageUrl: string | null;
  createdBy: string;
  allowMembersToAddEvents: boolean;
  cancelled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API response type for trip creation
 */
interface CreateTripResponse {
  success: true;
  trip: Trip;
}

/**
 * API response type for trip update
 */
interface UpdateTripResponse {
  success: true;
  trip: Trip;
}

/**
 * API response type for trip cancellation
 */
interface CancelTripResponse {
  success: true;
  message: string;
}

/**
 * Hook for creating a new trip with optimistic updates
 *
 * Features:
 * - Optimistic updates: Adds trip to cache immediately
 * - Automatic redirect: Navigates to trip detail page on success
 * - Error rollback: Reverts optimistic update on failure
 * - Network error handling: Provides user-friendly error messages
 *
 * @returns Mutation object with mutate function and state
 *
 * @example
 * ```tsx
 * const { mutate, isPending, error } = useCreateTrip();
 *
 * const handleSubmit = (data: CreateTripInput) => {
 *   mutate(data);
 * };
 * ```
 */
/**
 * Context type for mutation callbacks
 * Contains previous state for rollback on error
 */
interface CreateTripContext {
  previousTrips: Trip[] | undefined;
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<Trip, Error, CreateTripInput, CreateTripContext>({
    mutationFn: async (data: CreateTripInput) => {
      const response = await apiRequest<CreateTripResponse>("/trips", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response.trip;
    },

    // Optimistic update: Add trip to cache immediately
    onMutate: async (newTrip) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["trips"] });

      // Snapshot the previous value for rollback
      const previousTrips = queryClient.getQueryData<Trip[]>(["trips"]);

      // Optimistically update the cache with a temporary trip
      // Note: We create a temporary ID and placeholder data since we don't have the real ID yet
      const optimisticTrip: Trip = {
        id: "temp-" + Date.now(), // Temporary ID until server responds
        name: newTrip.name,
        destination: newTrip.destination,
        startDate: newTrip.startDate || null,
        endDate: newTrip.endDate || null,
        preferredTimezone: newTrip.timezone,
        description: newTrip.description || null,
        coverImageUrl: newTrip.coverImageUrl || null,
        createdBy: "current-user", // Placeholder - will be replaced by server response
        allowMembersToAddEvents: newTrip.allowMembersToAddEvents ?? true,
        cancelled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add optimistic trip to the cache if trips list exists
      if (previousTrips) {
        queryClient.setQueryData<Trip[]>(
          ["trips"],
          [optimisticTrip, ...previousTrips],
        );
      }

      // Return context with previous data for rollback
      return { previousTrips: previousTrips || undefined };
    },

    // On success: Invalidate queries and redirect
    onSuccess: (trip) => {
      // Invalidate trips list to refetch with real data from server
      queryClient.invalidateQueries({ queryKey: ["trips"] });

      // Redirect to the trip detail page
      router.push(`/trips/${trip.id}`);
    },

    // On error: Rollback optimistic update
    onError: (error, _newTrip, context) => {
      // Rollback to previous trips list if we had one
      if (context?.previousTrips) {
        queryClient.setQueryData(["trips"], context.previousTrips);
      }

      // Log error for debugging
      console.error("Failed to create trip:", error);
    },

    // Always invalidate queries after mutation settles (success or error)
    // This ensures the cache stays in sync with the server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

/**
 * Get user-friendly error message from mutation error
 *
 * @param error - Error from mutation
 * @returns User-friendly error message
 */
export function getCreateTripErrorMessage(error: Error | null): string | null {
  if (!error) return null;

  if (error instanceof APIError) {
    switch (error.code) {
      case "CO_ORGANIZER_NOT_FOUND":
        return "One or more co-organizers could not be found. Please check the phone numbers and try again.";
      case "MEMBER_LIMIT_EXCEEDED":
        return "Trip cannot be created: maximum 25 members allowed (including creator and co-organizers).";
      case "VALIDATION_ERROR":
        return "Please check your input and try again.";
      case "UNAUTHORIZED":
        return "You must be logged in to create a trip.";
      default:
        return error.message;
    }
  }

  // Network errors or other generic errors
  if (error.message.includes("fetch")) {
    return "Network error: Please check your connection and try again.";
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Context type for update mutation callbacks
 * Contains previous state for rollback on error
 */
interface UpdateTripContext {
  previousTrips: Trip[] | undefined;
  previousTrip: Trip | undefined;
}

/**
 * Hook for updating an existing trip with optimistic updates
 *
 * Features:
 * - Optimistic updates: Updates trip in cache immediately
 * - Error rollback: Reverts optimistic update on failure
 * - Network error handling: Provides user-friendly error messages
 * - Cache invalidation: Updates both trips list and individual trip cache
 *
 * @returns Mutation object with mutate function and state
 *
 * @example
 * ```tsx
 * const { mutate, isPending, error } = useUpdateTrip();
 *
 * const handleSubmit = (tripId: string, data: UpdateTripInput) => {
 *   mutate({ tripId, data });
 * };
 * ```
 */
export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation<
    Trip,
    Error,
    { tripId: string; data: UpdateTripInput },
    UpdateTripContext
  >({
    mutationFn: async ({ tripId, data }) => {
      const response = await apiRequest<UpdateTripResponse>(
        `/trips/${tripId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      );
      return response.trip;
    },

    // Optimistic update: Update trip in cache immediately
    onMutate: async ({ tripId, data }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["trips"] });
      await queryClient.cancelQueries({ queryKey: ["trips", tripId] });

      // Snapshot the previous values for rollback
      const previousTrips = queryClient.getQueryData<Trip[]>(["trips"]);
      const previousTrip = queryClient.getQueryData<Trip>(["trips", tripId]);

      // Optimistically update the individual trip cache
      if (previousTrip) {
        const optimisticTrip: Trip = {
          ...previousTrip,
          // Only update fields that are provided in the data
          name: data.name ?? previousTrip.name,
          destination: data.destination ?? previousTrip.destination,
          startDate: data.startDate !== undefined ? data.startDate ?? null : previousTrip.startDate,
          endDate: data.endDate !== undefined ? data.endDate ?? null : previousTrip.endDate,
          preferredTimezone: data.timezone ?? previousTrip.preferredTimezone,
          description: data.description !== undefined ? data.description ?? null : previousTrip.description,
          coverImageUrl: data.coverImageUrl !== undefined ? data.coverImageUrl ?? null : previousTrip.coverImageUrl,
          allowMembersToAddEvents: data.allowMembersToAddEvents ?? previousTrip.allowMembersToAddEvents,
          updatedAt: new Date(),
        };

        queryClient.setQueryData<Trip>(["trips", tripId], optimisticTrip);

        // Also update the trip in the trips list cache
        if (previousTrips) {
          queryClient.setQueryData<Trip[]>(
            ["trips"],
            previousTrips.map((trip) =>
              trip.id === tripId ? optimisticTrip : trip,
            ),
          );
        }
      }

      // Return context with previous data for rollback
      return { previousTrips, previousTrip };
    },

    // On success: Invalidate queries to refetch with real data
    onSuccess: (trip) => {
      // Invalidate trips list and individual trip to refetch with real data from server
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trips", trip.id] });
    },

    // On error: Rollback optimistic update
    onError: (error, { tripId }, context) => {
      // Rollback to previous state if we had one
      if (context?.previousTrip) {
        queryClient.setQueryData(["trips", tripId], context.previousTrip);
      }
      if (context?.previousTrips) {
        queryClient.setQueryData(["trips"], context.previousTrips);
      }

      // Log error for debugging
      console.error("Failed to update trip:", error);
    },

    // Always invalidate queries after mutation settles (success or error)
    // This ensures the cache stays in sync with the server
    onSettled: (_data, _error, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] });
    },
  });
}

/**
 * Get user-friendly error message from update mutation error
 *
 * @param error - Error from mutation
 * @returns User-friendly error message
 */
export function getUpdateTripErrorMessage(error: Error | null): string | null {
  if (!error) return null;

  if (error instanceof APIError) {
    switch (error.code) {
      case "PERMISSION_DENIED":
        return "You don't have permission to edit this trip.";
      case "NOT_FOUND":
        return "Trip not found.";
      case "VALIDATION_ERROR":
        return "Please check your input and try again.";
      case "UNAUTHORIZED":
        return "You must be logged in to edit a trip.";
      default:
        return error.message;
    }
  }

  // Network errors or other generic errors
  if (error.message.includes("fetch")) {
    return "Network error: Please check your connection and try again.";
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Context type for cancel mutation callbacks
 * Contains previous state for rollback on error
 */
interface CancelTripContext {
  previousTrips: Trip[] | undefined;
}

/**
 * Hook for canceling (soft deleting) a trip
 *
 * Features:
 * - Optimistic updates: Removes trip from cache immediately
 * - Automatic redirect: Navigates to dashboard on success
 * - Error rollback: Reverts optimistic update on failure
 * - Network error handling: Provides user-friendly error messages
 *
 * @returns Mutation object with mutate function and state
 *
 * @example
 * ```tsx
 * const { mutate, isPending, error } = useCancelTrip();
 *
 * const handleDelete = (tripId: string) => {
 *   mutate(tripId);
 * };
 * ```
 */
export function useCancelTrip() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<void, Error, string, CancelTripContext>({
    mutationFn: async (tripId: string) => {
      await apiRequest<CancelTripResponse>(`/trips/${tripId}`, {
        method: "DELETE",
      });
    },

    // Optimistic update: Remove trip from cache immediately
    onMutate: async (tripId) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["trips"] });

      // Snapshot the previous value for rollback
      const previousTrips = queryClient.getQueryData<Trip[]>(["trips"]);

      // Optimistically remove the trip from the cache
      if (previousTrips) {
        queryClient.setQueryData<Trip[]>(
          ["trips"],
          previousTrips.filter((trip) => trip.id !== tripId),
        );
      }

      // Return context with previous data for rollback
      return { previousTrips };
    },

    // On success: Invalidate queries and redirect
    onSuccess: () => {
      // Invalidate trips list to refetch with real data from server
      queryClient.invalidateQueries({ queryKey: ["trips"] });

      // Redirect to the dashboard
      router.push("/dashboard");
    },

    // On error: Rollback optimistic update
    onError: (error, _tripId, context) => {
      // Rollback to previous trips list if we had one
      if (context?.previousTrips) {
        queryClient.setQueryData(["trips"], context.previousTrips);
      }

      // Log error for debugging
      console.error("Failed to cancel trip:", error);
    },

    // Always invalidate queries after mutation settles (success or error)
    // This ensures the cache stays in sync with the server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

/**
 * Get user-friendly error message from cancel mutation error
 *
 * @param error - Error from mutation
 * @returns User-friendly error message
 */
export function getCancelTripErrorMessage(error: Error | null): string | null {
  if (!error) return null;

  if (error instanceof APIError) {
    switch (error.code) {
      case "PERMISSION_DENIED":
        return "You don't have permission to delete this trip.";
      case "NOT_FOUND":
        return "Trip not found.";
      case "UNAUTHORIZED":
        return "You must be logged in to delete a trip.";
      default:
        return error.message;
    }
  }

  // Network errors or other generic errors
  if (error.message.includes("fetch")) {
    return "Network error: Please check your connection and try again.";
  }

  return "An unexpected error occurred. Please try again.";
}
