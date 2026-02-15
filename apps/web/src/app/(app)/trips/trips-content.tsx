"use client";

import { useState, useMemo } from "react";
import { Plus, Search, AlertCircle, Loader2 } from "lucide-react";
import { useTrips, type TripSummary } from "@/hooks/use-trips";
import { TripCard } from "@/components/trip/trip-card";
import { CreateTripDialog } from "@/components/trip/create-trip-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export function TripsContent() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: trips = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useTrips();

  // Filter trips by search query (case-insensitive, searches name and destination)
  const filteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return trips;

    const query = searchQuery.toLowerCase();
    return trips.filter(
      (trip) =>
        trip.name.toLowerCase().includes(query) ||
        trip.destination.toLowerCase().includes(query),
    );
  }, [trips, searchQuery]);

  // Split trips into upcoming and past based on start date
  const { upcomingTrips, pastTrips } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming: TripSummary[] = [];
    const past: TripSummary[] = [];
    for (const trip of filteredTrips) {
      if (!trip.startDate) {
        upcoming.push(trip);
        continue;
      }
      const startDate = new Date(trip.startDate);
      if (startDate >= today) {
        upcoming.push(trip);
      } else {
        past.push(trip);
      }
    }
    return { upcomingTrips: upcoming, pastTrips: past };
  }, [filteredTrips]);

  const tripCount = trips.length;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const noResults = filteredTrips.length === 0 && hasSearchQuery;
  const isEmpty = trips.length === 0 && !isPending;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 font-[family-name:var(--font-playfair)]">
            My Trips
          </h1>
          {!isPending && !isError && (
            <p className="text-muted-foreground">
              {tripCount} trip{tripCount !== 1 ? "s" : ""}
            </p>
          )}
        </header>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search trips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl"
          />
        </div>

        {/* Loading State */}
        {isPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-card rounded-2xl border border-destructive/30 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2 font-[family-name:var(--font-playfair)]">
              Failed to load trips
            </h2>
            <p className="text-muted-foreground mb-6">
              {error?.message || "An unexpected error occurred"}
            </p>
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              variant="gradient"
              className="h-12 px-8 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetching && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isFetching ? "Loading..." : "Try again"}
            </Button>
          </div>
        )}

        {/* Empty State (no trips at all) */}
        {isEmpty && (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-foreground mb-2 font-[family-name:var(--font-playfair)]">
                No trips yet
              </h2>
              <p className="text-muted-foreground mb-6">
                Start planning your next adventure by creating your first trip.
              </p>
              <Button
                onClick={() => setCreateDialogOpen(true)}

                variant="gradient"
                className="h-12 px-8 rounded-xl"
              >
                <Plus className="w-5 h-5 mr-2" strokeWidth={2.5} />
                Create your first trip
              </Button>
            </div>
          </div>
        )}

        {/* No Search Results */}
        {noResults && (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2 font-[family-name:var(--font-playfair)]">
              No trips found
            </h2>
            <p className="text-muted-foreground">
              Try searching with different keywords
            </p>
          </div>
        )}

        {/* Trips Sections */}
        {!isPending && !isError && !isEmpty && !noResults && (
          <div aria-live="polite">
            {/* Upcoming Trips */}
            {upcomingTrips.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-4 font-[family-name:var(--font-playfair)]">
                  Upcoming trips
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingTrips.map((trip, index) => (
                    <TripCard key={trip.id} trip={trip} index={index} />
                  ))}
                </div>
              </section>
            )}

            {/* Past Trips */}
            {pastTrips.length > 0 && (
              <section>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-4 font-[family-name:var(--font-playfair)]">
                  Past trips
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastTrips.map((trip, index) => (
                    <TripCard key={trip.id} trip={trip} index={index} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <Button
        onClick={() => setCreateDialogOpen(true)}
        variant="gradient"
        size="icon"
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 rounded-full z-50"
        aria-label="Create new trip"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </Button>

      {/* Create Trip Dialog */}
      <CreateTripDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
