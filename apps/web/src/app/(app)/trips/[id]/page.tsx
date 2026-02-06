"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Users,
  ClipboardList,
  AlertCircle,
  Settings,
  CalendarX,
} from "lucide-react";
import { useTripDetail } from "@/hooks/use-trips";
import { useAuth } from "@/app/providers/auth-provider";
import { EditTripDialog } from "@/components/trip/edit-trip-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Dates TBD";

  // Parse dates as UTC to avoid timezone issues
  const parseDate = (dateStr: string) => {
    const parts = dateStr.split("-").map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    if (!year || !month || !day) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    return new Date(Date.UTC(year, month - 1, day));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  };

  if (!start && end) return `Ends ${formatDate(parseDate(end))}`;
  if (start && !end) return `Starts ${formatDate(parseDate(start))}`;

  // Both dates present
  const startDate = parseDate(start!);
  const endDate = parseDate(end!);

  const startMonth = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(startDate);
  const startDay = startDate.getUTCDate();
  const endMonth = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(endDate);
  const endDay = endDate.getUTCDate();
  const year = endDate.getUTCFullYear();

  // Same month
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }

  // Different months
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function SkeletonDetail() {
  return (
    <div className="animate-pulse">
      <div className="h-80 bg-slate-200" />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="h-10 bg-slate-200 rounded w-1/2" />
        <div className="h-6 bg-slate-200 rounded w-1/3" />
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-20 bg-slate-200 rounded" />
      </div>
    </div>
  );
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const { user } = useAuth();
  const { data: trip, isLoading, isError } = useTripDetail(tripId);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // Determine if user is an organizer
  const isOrganizer =
    user &&
    trip &&
    (trip.createdBy === user.id ||
      trip.organizers.some((org) => org.id === user.id));

  const dateRange = trip ? formatDateRange(trip.startDate, trip.endDate) : "";

  // Loading state
  if (isLoading) {
    return <SkeletonDetail />;
  }

  // Error state
  if (isError || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2
            className="text-2xl font-semibold text-slate-900 mb-2"
            style={{ fontFamily: "Playfair Display, serif" }}
          >
            Trip not found
          </h2>
          <p className="text-slate-600 mb-6">
            This trip doesn't exist or you don't have access to it.
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="h-12 px-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
          >
            Return to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-xl bg-green-50 border border-green-200 shadow-lg">
          <p className="text-sm text-green-600 font-medium">
            ✓ Trip updated successfully
          </p>
        </div>
      )}

      {/* Hero section with cover image */}
      {trip.coverImageUrl ? (
        <div className="relative h-80 overflow-hidden">
          <img
            src={trip.coverImageUrl}
            alt={trip.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="relative h-80 overflow-hidden bg-gradient-to-br from-slate-100 to-blue-100">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trip header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <h1
              className="text-4xl font-bold text-slate-900"
              style={{ fontFamily: "Playfair Display, serif" }}
            >
              {trip.name}
            </h1>
            {isOrganizer && (
              <Button
                onClick={() => setIsEditOpen(true)}
                variant="outline"
                className="h-10 px-4 rounded-xl border-slate-300 hover:bg-slate-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit trip
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-lg text-slate-600 mb-4">
            <MapPin className="w-5 h-5 shrink-0" />
            <span>{trip.destination}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-600 mb-4">
            <Calendar className="w-5 h-5 shrink-0" />
            <span>{dateRange}</span>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-6">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              Going
            </Badge>
            {isOrganizer && (
              <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                Organizing
              </Badge>
            )}
          </div>

          {/* Organizers */}
          {trip.organizers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                Organizers
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {trip.organizers.map((org) =>
                    org.profilePhotoUrl ? (
                      <img
                        key={org.id}
                        src={org.profilePhotoUrl}
                        alt={org.displayName}
                        className="w-8 h-8 rounded-full ring-2 ring-white"
                      />
                    ) : (
                      <div
                        key={org.id}
                        className="w-8 h-8 rounded-full ring-2 ring-white bg-slate-300 flex items-center justify-center text-xs font-medium text-slate-700"
                      >
                        {getInitials(org.displayName)}
                      </div>
                    ),
                  )}
                </div>
                <span className="text-sm text-slate-600">
                  {trip.organizers.map((org) => org.displayName).join(", ")}
                </span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="w-5 h-5" />
              <span className="text-sm">
                {trip.memberCount} member{trip.memberCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <ClipboardList className="w-5 h-5" />
              <span className="text-sm">0 events</span>
            </div>
          </div>

          {/* Description */}
          {trip.description && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                About this trip
              </h3>
              <p className="text-slate-600 whitespace-pre-wrap">
                {trip.description}
              </p>
            </div>
          )}
        </div>

        {/* Events section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <CalendarX className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2
            className="text-2xl font-semibold text-slate-900 mb-2"
            style={{ fontFamily: "Playfair Display, serif" }}
          >
            No events yet
          </h2>
          <p className="text-slate-600">Events coming in Phase 5!</p>
        </div>
      </div>

      {/* Edit Trip Dialog */}
      {isOrganizer && trip && (
        <EditTripDialog
          trip={trip}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSuccess={() => {
            setShowSuccessBanner(true);
            setTimeout(() => setShowSuccessBanner(false), 5000);
          }}
        />
      )}
    </div>
  );
}
