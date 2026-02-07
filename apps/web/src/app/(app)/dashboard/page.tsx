import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { tripKeys } from "@/hooks/trip-queries";
import { serverApiRequest } from "@/lib/server-api";
import { DashboardContent } from "./dashboard-content";
import type { GetTripsResponse } from "@tripful/shared/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const queryClient = getQueryClient();

  try {
    const response = await serverApiRequest<GetTripsResponse>("/trips");
    queryClient.setQueryData(tripKeys.all, response.data);
  } catch {
    // Prefetch failed (e.g., server-side cookie not available)
    // Client component will fetch on mount
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent />
    </HydrationBoundary>
  );
}
