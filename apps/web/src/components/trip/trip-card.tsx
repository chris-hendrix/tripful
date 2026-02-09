"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, ClipboardList, ImagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RsvpBadge } from "@/components/ui/rsvp-badge";
import { formatDateRange, getInitials } from "@/lib/format";
import { usePrefetchTrip } from "@/hooks/use-trips";

interface TripCardProps {
  trip: {
    id: string;
    name: string;
    destination: string;
    startDate: string | null;
    endDate: string | null;
    coverImageUrl: string | null;
    isOrganizer: boolean;
    rsvpStatus: "going" | "not_going" | "maybe" | "no_response";
    organizerInfo?: Array<{
      id: string;
      displayName: string;
      profilePhotoUrl: string | null;
    }>;
    memberCount: number;
    eventCount: number;
  };
  index?: number;
}

export const TripCard = memo(function TripCard({
  trip,
  index = 0,
}: TripCardProps) {
  const prefetchTrip = usePrefetchTrip(trip.id);

  const dateRange = formatDateRange(trip.startDate, trip.endDate);

  // Show up to 3 organizers
  const displayedOrganizers = (trip.organizerInfo ?? []).slice(0, 3);
  const firstOrganizer = trip.organizerInfo?.[0];
  const organizerLabel = firstOrganizer
    ? `${firstOrganizer.displayName}${(trip.organizerInfo?.length ?? 0) > 1 ? ` +${(trip.organizerInfo?.length ?? 0) - 1}` : ""}`
    : "";

  return (
    <Link
      href={`/trips/${trip.id}`}
      onMouseEnter={prefetchTrip}
      onFocus={prefetchTrip}
      className="block bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Cover image or placeholder */}
      {trip.coverImageUrl ? (
        <div className="relative h-48 overflow-hidden">
          <Image
            src={trip.coverImageUrl}
            alt={trip.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex gap-2">
            {trip.isOrganizer && (
              <Badge className="bg-black/50 backdrop-blur-md text-white border-white/20 shadow-sm">
                Organizing
              </Badge>
            )}
            <RsvpBadge status={trip.rsvpStatus} variant="overlay" />
          </div>
        </div>
      ) : (
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/15 to-secondary/20">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ImagePlus className="w-8 h-8 text-white/30" />
          </div>

          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex gap-2">
            {trip.isOrganizer && (
              <Badge className="bg-black/50 backdrop-blur-md text-white border-white/20 shadow-sm">
                Organizing
              </Badge>
            )}
            <RsvpBadge status={trip.rsvpStatus} variant="overlay" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1 truncate font-[family-name:var(--font-playfair)]">
            {trip.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{trip.destination}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{dateRange}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex -space-x-2 shrink-0">
              {displayedOrganizers.map((org) =>
                org.profilePhotoUrl ? (
                  <Image
                    key={org.id}
                    src={org.profilePhotoUrl}
                    alt={org.displayName}
                    width={24}
                    height={24}
                    className="rounded-full ring-2 ring-white"
                  />
                ) : (
                  <div
                    key={org.id}
                    className="w-6 h-6 rounded-full ring-2 ring-white bg-muted flex items-center justify-center text-[10px] font-medium text-foreground"
                  >
                    {getInitials(org.displayName)}
                  </div>
                ),
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {organizerLabel}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <ClipboardList className="w-4 h-4" />
            <span>
              {trip.eventCount === 0
                ? "No events yet"
                : `${trip.eventCount} event${trip.eventCount === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});
