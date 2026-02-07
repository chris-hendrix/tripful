import {
  isServer,
  QueryClient,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import { APIError } from "@/lib/api";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 1000 * 60 * 60,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry on deterministic errors — they won't succeed on retry
          // Codes from apps/api/src/errors.ts plus Fastify built-in validation codes
          if (error instanceof APIError) {
            const nonRetriableErrorCodes = [
              "NOT_FOUND",
              "PERMISSION_DENIED",
              "UNAUTHORIZED",
              "PROFILE_INCOMPLETE",
              "VALIDATION_ERROR",
              "BAD_REQUEST",
              "CO_ORGANIZER_NOT_FOUND",
              "CANNOT_REMOVE_CREATOR",
              "FILE_TOO_LARGE",
              "INVALID_FILE_TYPE",
              "INVALID_CODE",
              "MEMBER_LIMIT_EXCEEDED",
              "DUPLICATE_MEMBER",
            ];
            if (nonRetriableErrorCodes.includes(error.code)) return false;
          }
          return failureCount < 1;
        },
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
        shouldRedactErrors: () => false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
