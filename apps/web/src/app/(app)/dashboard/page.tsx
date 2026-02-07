"use client";

import { useState, useMemo } from "react";
import { Plus, Search, AlertCircle, Loader2 } from "lucide-react";
import { useTrips } from "@/hooks/use-trips";
import { TripCard } from "@/components/trip/trip-card";
import { CreateTripDialog } from "@/components/trip/create-trip-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 animate-pulse">
      <div className="h-40 bg-slate-200" />
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-6 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
        </div>
        <div className="h-4 bg-slate-200 rounded w-2/3" />
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="h-6 bg-slate-200 rounded w-24" />
          <div className="h-4 bg-slate-200 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: trips = [],
    isLoading,
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

    const upcomingTrips = filteredTrips.filter((trip) => {
      if (!trip.startDate) return true; // Trips without start date are considered upcoming
      const startDate = new Date(trip.startDate);
      return startDate >= today;
    });

    const pastTrips = filteredTrips.filter((trip) => {
      if (!trip.startDate) return false;
      const startDate = new Date(trip.startDate);
      return startDate < today;
    });

    return { upcomingTrips, pastTrips };
  }, [filteredTrips]);

  const tripCount = trips.length;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const noResults = filteredTrips.length === 0 && hasSearchQuery;
  const isEmpty = trips.length === 0 && !isLoading;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1
            className="text-4xl font-bold text-slate-900 mb-2 font-[family-name:var(--font-playfair)]"
          >
            My Trips
          </h1>
          {!isLoading && !isError && (
            <p className="text-slate-600">
              {tripCount} trip{tripCount !== 1 ? "s" : ""}
            </p>
          )}
        </header>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search trips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2
              className="text-2xl font-semibold text-slate-900 mb-2 font-[family-name:var(--font-playfair)]"
            >
              Failed to load trips
            </h2>
            <p className="text-slate-600 mb-6">
              {error?.message || "An unexpected error occurred"}
            </p>
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-12 px-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetching && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isFetching ? "Loading..." : "Try again"}
            </Button>
          </div>
        )}

        {/* Empty State (no trips at all) */}
        {isEmpty && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <h2
                className="text-2xl font-semibold text-slate-900 mb-2 font-[family-name:var(--font-playfair)]"
              >
                No trips yet
              </h2>
              <p className="text-slate-600 mb-6">
                Start planning your next adventure by creating your first trip.
              </p>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="h-12 px-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
              >
                <Plus className="w-5 h-5 mr-2" strokeWidth={2.5} />
                Create your first trip
              </Button>
            </div>
          </div>
        )}

        {/* No Search Results */}
        {noResults && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2
              className="text-xl font-semibold text-slate-900 mb-2 font-[family-name:var(--font-playfair)]"
            >
              No trips found
            </h2>
            <p className="text-slate-600">
              Try searching with different keywords
            </p>
          </div>
        )}

        {/* Trips Sections */}
        {!isLoading && !isError && !isEmpty && !noResults && (
          <>
            {/* Upcoming Trips */}
            {upcomingTrips.length > 0 && (
              <section className="mb-12">
                <h2
                  className="text-2xl font-semibold text-slate-900 mb-4 font-[family-name:var(--font-playfair)]"
                >
                  Upcoming trips
                </h2>
                <div className="space-y-4">
                  {upcomingTrips.map((trip, index) => (
                    <TripCard key={trip.id} trip={trip} index={index} />
                  ))}
                </div>
              </section>
            )}

            {/* Past Trips */}
            {pastTrips.length > 0 && (
              <section>
                <h2
                  className="text-2xl font-semibold text-slate-900 mb-4 font-[family-name:var(--font-playfair)]"
                >
                  Past trips
                </h2>
                <div className="space-y-4">
                  {pastTrips.map((trip, index) => (
                    <TripCard key={trip.id} trip={trip} index={index} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setCreateDialogOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 flex items-center justify-center text-white z-50"
        aria-label="Create new trip"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>

      {/* Create Trip Dialog */}
      <CreateTripDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
