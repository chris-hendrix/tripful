"use client";

import Image from "next/image";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Users,
  ImagePlus,
  Loader2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateRange, getInitials } from "@/lib/format";
import {
  useUpdateRsvp,
  getUpdateRsvpErrorMessage,
} from "@/hooks/use-invitations";
import type { TripDetailWithMeta } from "@/hooks/use-trips";
import type { UpdateRsvpInput } from "@tripful/shared/schemas";

interface TripPreviewProps {
  trip: TripDetailWithMeta;
  tripId: string;
}

export function TripPreview({ trip, tripId }: TripPreviewProps) {
  const { mutate: updateRsvp, isPending } = useUpdateRsvp(tripId);

  const dateRange = formatDateRange(trip.startDate, trip.endDate);

  const handleRsvp = (status: UpdateRsvpInput["status"]) => {
    updateRsvp(
      { status },
      {
        onSuccess: () => {
          const labels: Record<UpdateRsvpInput["status"], string> = {
            going: "Going",
            maybe: "Maybe",
            not_going: "Not Going",
          };
          toast.success(`RSVP updated to "${labels[status]}"`);
        },
        onError: (error) => {
          const message = getUpdateRsvpErrorMessage(error);
          toast.error(message ?? "Failed to update RSVP");
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section with cover image */}
      {trip.coverImageUrl ? (
        <div className="relative h-80 overflow-hidden">
          <Image
            src={trip.coverImageUrl}
            alt={trip.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="relative w-full h-80 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/15 to-secondary/20">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <ImagePlus className="w-12 h-12 text-white/40" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trip header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground font-[family-name:var(--font-playfair)] mb-4">
            {trip.name}
          </h1>

          <div className="flex items-center gap-2 text-lg text-muted-foreground mb-4">
            <MapPin className="w-5 h-5 shrink-0" />
            <span>{trip.destination}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Calendar className="w-5 h-5 shrink-0" />
            <span>{dateRange}</span>
          </div>

          {/* Member count */}
          <div className="flex items-center gap-2 text-muted-foreground mb-6">
            <Users className="w-5 h-5" />
            <span className="text-sm">
              {trip.memberCount} member{trip.memberCount !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Description */}
          {trip.description && (
            <div className="bg-card rounded-2xl border border-border p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                About this trip
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {trip.description}
              </p>
            </div>
          )}

          {/* Organizers */}
          {trip.organizers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Organizers
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {trip.organizers.map((org) =>
                    org.profilePhotoUrl ? (
                      <Image
                        key={org.id}
                        src={org.profilePhotoUrl}
                        alt={org.displayName}
                        width={32}
                        height={32}
                        className="rounded-full ring-2 ring-white"
                      />
                    ) : (
                      <div
                        key={org.id}
                        className="w-8 h-8 rounded-full ring-2 ring-white bg-muted flex items-center justify-center text-xs font-medium text-foreground"
                      >
                        {getInitials(org.displayName)}
                      </div>
                    ),
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {trip.organizers.map((org) => org.displayName).join(", ")}
                </span>
              </div>
            </div>
          )}

          {/* Invitation banner */}
          <div className="bg-card rounded-2xl border border-primary/20 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  You've been invited!
                </h3>
                <p className="text-muted-foreground">
                  RSVP to see the full itinerary.
                </p>
              </div>
            </div>
          </div>

          {/* RSVP buttons */}
          <div className="flex flex-wrap gap-3" data-testid="rsvp-buttons">
            <Button
              onClick={() => handleRsvp("going")}
              variant={
                trip.userRsvpStatus === "going" ? "default" : "outline"
              }
              className={
                trip.userRsvpStatus === "going"
                  ? "bg-success hover:bg-success/90 text-white border-success/30"
                  : "border-success/30 text-success hover:bg-success/10"
              }
              disabled={isPending}
            >
              {isPending && trip.userRsvpStatus !== "going" ? null : isPending &&
                trip.userRsvpStatus === "going" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Going
            </Button>

            <Button
              onClick={() => handleRsvp("maybe")}
              variant={
                trip.userRsvpStatus === "maybe" ? "default" : "outline"
              }
              className={
                trip.userRsvpStatus === "maybe"
                  ? "bg-amber-500 hover:bg-amber-500/90 text-white border-amber-500/30"
                  : "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              }
              disabled={isPending}
            >
              {isPending && trip.userRsvpStatus === "maybe" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Maybe
            </Button>

            <Button
              onClick={() => handleRsvp("not_going")}
              variant={
                trip.userRsvpStatus === "not_going" ? "default" : "ghost"
              }
              className={
                trip.userRsvpStatus === "not_going"
                  ? "bg-destructive/15 text-destructive border border-destructive/30"
                  : "text-destructive hover:bg-destructive/10 border border-destructive/30"
              }
              disabled={isPending}
            >
              {isPending && trip.userRsvpStatus === "not_going" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Not Going
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
