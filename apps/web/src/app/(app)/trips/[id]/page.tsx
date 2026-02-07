import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { tripKeys } from "@/hooks/trip-queries";
import { serverApiRequest } from "@/lib/server-api";
import { TripDetailContent } from "./trip-detail-content";
import type { GetTripResponse } from "@tripful/shared/types";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Trip ${id}` };
}

export default async function TripDetailPage({ params }: Props) {
  const { id } = await params;
  const queryClient = getQueryClient();

  try {
    const response = await serverApiRequest<GetTripResponse>(`/trips/${id}`);
    queryClient.setQueryData(tripKeys.detail(id), response.trip);
  } catch {
    // Prefetch failed — client component will fetch on mount
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TripDetailContent tripId={id} />
    </HydrationBoundary>
  );
}
