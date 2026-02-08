"use client";

import { useState } from "react";
import { AlertCircle, CalendarX } from "lucide-react";
import { useAuth } from "@/app/providers/auth-provider";
import { useEvents } from "@/hooks/use-events";
import { useAccommodations } from "@/hooks/use-accommodations";
import { useMemberTravels } from "@/hooks/use-member-travel";
import { useTripDetail } from "@/hooks/use-trips";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ItineraryHeader } from "./itinerary-header";
import { DayByDayView } from "./day-by-day-view";
import { GroupByTypeView } from "./group-by-type-view";

interface ItineraryViewProps {
  tripId: string;
}

export function ItineraryView({ tripId }: ItineraryViewProps) {
  const { user } = useAuth();

  // Fetch data
  const {
    data: trip,
    isPending: tripPending,
    isError: tripError,
    refetch: refetchTrip,
  } = useTripDetail(tripId);
  const {
    data: events = [],
    isPending: eventsPending,
    isError: eventsError,
    refetch: refetchEvents,
  } = useEvents(tripId);
  const {
    data: accommodations = [],
    isPending: accommodationsPending,
    isError: accommodationsError,
    refetch: refetchAccommodations,
  } = useAccommodations(tripId);
  const {
    data: memberTravels = [],
    isPending: memberTravelsPending,
    isError: memberTravelsError,
    refetch: refetchMemberTravels,
  } = useMemberTravels(tripId);

  // View state
  const [viewMode, setViewMode] = useState<"day-by-day" | "group-by-type">(
    "day-by-day",
  );
  const [showUserTime, setShowUserTime] = useState(false);

  // Determine timezone
  const tripTimezone = trip?.preferredTimezone || "UTC";
  const userTimezone = user?.timezone || "UTC";
  const timezone = showUserTime ? userTimezone : tripTimezone;

  // Determine if user is an organizer or member
  const isOrganizer =
    user &&
    trip &&
    (trip.createdBy === user.id ||
      trip.organizers.some((org) => org.id === user.id));

  // For now, assume all authenticated users viewing the trip are members
  // In the future, this should check actual membership status from the API
  const isMember = !!user && !!trip;

  // Loading state
  const isLoading =
    tripPending ||
    eventsPending ||
    accommodationsPending ||
    memberTravelsPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
          <div className="max-w-5xl mx-auto">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 space-y-6">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Error state
  const hasError = tripError || eventsError || accommodationsError || memberTravelsError;
  if (hasError) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl border border-destructive/30 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2 font-[family-name:var(--font-playfair)]">
            Failed to load itinerary
          </h2>
          <p className="text-muted-foreground mb-6">
            There was an error loading the trip data. Please try again.
          </p>
          <Button
            variant="gradient"
            onClick={() => {
              refetchTrip();
              refetchEvents();
              refetchAccommodations();
              refetchMemberTravels();
            }}
            className="h-12 px-8 rounded-xl"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  const hasNoContent =
    events.length === 0 &&
    accommodations.length === 0 &&
    memberTravels.length === 0;

  if (hasNoContent) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <CalendarX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2 font-[family-name:var(--font-playfair)]">
            No itinerary yet
          </h2>
          <p className="text-muted-foreground mb-6">
            Start planning your trip by adding events, accommodations, and
            travel details.
          </p>
          {isOrganizer && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="gradient"
                className="h-12 px-8 rounded-xl"
                onClick={() => {
                  // TODO: Open create event dialog
                }}
              >
                Add Event
              </Button>
              <Button
                variant="outline"
                className="h-12 px-8 rounded-xl"
                onClick={() => {
                  // TODO: Open create accommodation dialog
                }}
              >
                Add Accommodation
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with toggles */}
      <ItineraryHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showUserTime={showUserTime}
        onShowUserTimeChange={setShowUserTime}
        tripTimezone={tripTimezone}
        userTimezone={userTimezone}
        tripId={tripId}
        isOrganizer={!!isOrganizer}
        isMember={!!isMember}
        allowMembersToAddEvents={trip?.allowMembersToAddEvents || false}
      />

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {viewMode === "day-by-day" ? (
          <DayByDayView
            events={events}
            accommodations={accommodations}
            memberTravels={memberTravels}
            timezone={timezone}
            tripStartDate={trip?.startDate || null}
            tripEndDate={trip?.endDate || null}
            isOrganizer={!!isOrganizer}
            userId={user?.id || ""}
          />
        ) : (
          <GroupByTypeView
            events={events}
            accommodations={accommodations}
            timezone={timezone}
            isOrganizer={!!isOrganizer}
            userId={user?.id || ""}
          />
        )}
      </div>
    </div>
  );
}
