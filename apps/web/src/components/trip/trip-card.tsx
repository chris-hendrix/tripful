"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar, MapPin, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateRange, getInitials } from "@/lib/format";

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

function getRsvpBadge(status: "going" | "not_going" | "maybe" | "no_response") {
  switch (status) {
    case "going":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          Going
        </Badge>
      );
    case "maybe":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          Maybe
        </Badge>
      );
    case "not_going":
      return (
        <Badge variant="outline" className="text-slate-600 border-slate-300">
          Not going
        </Badge>
      );
    case "no_response":
      return null;
  }
}

export function TripCard({ trip, index = 0 }: TripCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/trips/${trip.id}`);
  };

  const dateRange = formatDateRange(trip.startDate, trip.endDate);
  const rsvpBadge = getRsvpBadge(trip.rsvpStatus);

  // Show up to 3 organizers
  const displayedOrganizers = (trip.organizerInfo ?? []).slice(0, 3);
  const firstOrganizer = trip.organizerInfo?.[0];
  const organizerLabel = firstOrganizer
    ? `${firstOrganizer.displayName}${(trip.organizerInfo?.length ?? 0) > 1 ? ` +${(trip.organizerInfo?.length ?? 0) - 1}` : ""}`
    : "";

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Cover image or placeholder */}
      {trip.coverImageUrl ? (
        <div className="relative h-40 overflow-hidden">
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
              <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30">
                Organizing
              </Badge>
            )}
            {rsvpBadge}
          </div>
        </div>
      ) : (
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-100 to-blue-100">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex gap-2">
            {trip.isOrganizer && (
              <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30">
                Organizing
              </Badge>
            )}
            {rsvpBadge}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3
            className="text-lg font-semibold text-slate-900 mb-1 truncate font-[family-name:var(--font-playfair)]"
          >
            {trip.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{trip.destination}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{dateRange}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
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
                    className="w-6 h-6 rounded-full ring-2 ring-white bg-slate-300 flex items-center justify-center text-[10px] font-medium text-slate-700"
                  >
                    {getInitials(org.displayName)}
                  </div>
                ),
              )}
            </div>
            <span className="text-xs text-slate-600 truncate">
              {organizerLabel}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-600 shrink-0">
            <ClipboardList className="w-4 h-4" />
            <span>
              {trip.eventCount === 0
                ? "No events yet"
                : `${trip.eventCount} event${trip.eventCount === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
