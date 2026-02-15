import { queryOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type {
  GetMessagesResponse,
  GetMessageCountResponse,
  GetLatestMessageResponse,
} from "@tripful/shared/types";

/**
 * Query key factory for message-related queries
 */
export const messageKeys = {
  all: ["messages"] as const,
  lists: () => ["messages", "list"] as const,
  list: (tripId: string) => ["messages", "list", tripId] as const,
  count: (tripId: string) => ["messages", "count", tripId] as const,
  latest: (tripId: string) => ["messages", "latest", tripId] as const,
  create: () => ["messages", "create"] as const,
  update: () => ["messages", "update"] as const,
  delete: () => ["messages", "delete"] as const,
  pin: () => ["messages", "pin"] as const,
  reaction: () => ["messages", "reaction"] as const,
  mute: () => ["messages", "mute"] as const,
  unmute: () => ["messages", "unmute"] as const,
};

/**
 * Query options for fetching paginated messages for a trip
 */
export const messagesQueryOptions = (tripId: string) =>
  queryOptions({
    queryKey: messageKeys.list(tripId),
    staleTime: 30 * 1000,
    queryFn: async ({ signal }) => {
      const response = await apiRequest<GetMessagesResponse>(
        `/trips/${tripId}/messages`,
        { signal },
      );
      return response;
    },
    enabled: !!tripId,
  });

/**
 * Query options for fetching the message count for a trip
 */
export const messageCountQueryOptions = (tripId: string) =>
  queryOptions({
    queryKey: messageKeys.count(tripId),
    staleTime: 30 * 1000,
    queryFn: async ({ signal }) => {
      const response = await apiRequest<GetMessageCountResponse>(
        `/trips/${tripId}/messages/count`,
        { signal },
      );
      return response.count;
    },
    enabled: !!tripId,
  });

/**
 * Query options for fetching the latest message for a trip
 */
export const latestMessageQueryOptions = (tripId: string) =>
  queryOptions({
    queryKey: messageKeys.latest(tripId),
    staleTime: 30 * 1000,
    queryFn: async ({ signal }) => {
      const response = await apiRequest<GetLatestMessageResponse>(
        `/trips/${tripId}/messages/latest`,
        { signal },
      );
      return response.message;
    },
    enabled: !!tripId,
  });
