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
          // Don't retry on client errors (4xx) — they won't succeed on retry
          if (error instanceof APIError) {
            const clientErrorCodes = [
              "NOT_FOUND",
              "FORBIDDEN",
              "UNAUTHORIZED",
              "VALIDATION_ERROR",
              "BAD_REQUEST",
            ];
            if (clientErrorCodes.includes(error.code)) return false;
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
