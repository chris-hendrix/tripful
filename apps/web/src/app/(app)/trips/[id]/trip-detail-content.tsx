"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Users,
  ClipboardList,
  AlertCircle,
  Settings,
  ImagePlus,
  UserPlus,
} from "lucide-react";
import { useTripDetail } from "@/hooks/use-trips";
import { useEvents } from "@/hooks/use-events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RsvpBadge } from "@/components/ui/rsvp-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatDateRange, getInitials } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItineraryView } from "@/components/itinerary/itinerary-view";
import { MembersList } from "@/components/trip/members-list";
import { TripPreview } from "@/components/trip/trip-preview";

const EditTripDialog = dynamic(
  () =>
    import("@/components/trip/edit-trip-dialog").then((mod) => ({
      default: mod.EditTripDialog,
    })),
  { ssr: false },
);

const preloadEditTripDialog = () =>
  void import("@/components/trip/edit-trip-dialog");

const InviteMembersDialog = dynamic(
  () =>
    import("@/components/trip/invite-members-dialog").then((mod) => ({
      default: mod.InviteMembersDialog,
    })),
  { ssr: false },
);

const preloadInviteMembersDialog = () =>
  void import("@/components/trip/invite-members-dialog");

function SkeletonDetail() {
  return (
    <div>
      <Skeleton className="h-80 w-full rounded-none" />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

export function TripDetailContent({ tripId }: { tripId: string }) {
  const { data: trip, isPending, isError } = useTripDetail(tripId);
  const { data: events } = useEvents(tripId, { enabled: !trip?.isPreview });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Compute active event count (filter out soft-deleted events for safety)
  const activeEventCount = events?.filter((e) => !e.deletedAt).length ?? 0;

  // Determine if user is an organizer (from API response metadata)
  const isOrganizer = trip?.isOrganizer ?? false;

  const dateRange = trip ? formatDateRange(trip.startDate, trip.endDate) : "";

  // Loading state
  if (isPending) {
    return <SkeletonDetail />;
  }

  // Error state
  if (isError || !trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-destructive/30 p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2 font-[family-name:var(--font-playfair)]">
            Trip not found
          </h2>
          <p className="text-muted-foreground mb-6">
            This trip doesn't exist or you don't have access to it.
          </p>
          <Button variant="gradient" asChild className="h-12 px-8 rounded-xl">
            <Link href="/dashboard">Return to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Preview mode: show limited trip info with RSVP buttons
  if (trip.isPreview) {
    return <TripPreview trip={trip} tripId={tripId} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb navigation */}
      <Breadcrumb className="max-w-5xl mx-auto px-4 pt-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">My Trips</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{trip.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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
            {isOrganizer && (
              <span className="text-sm text-white/60">Add cover photo</span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trip header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-4xl font-bold text-foreground font-[family-name:var(--font-playfair)]">
              {trip.name}
            </h1>
            {isOrganizer && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsInviteOpen(true)}
                  onMouseEnter={preloadInviteMembersDialog}
                  onFocus={preloadInviteMembersDialog}
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 rounded-xl border-input hover:bg-secondary"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
                <Button
                  onClick={() => setIsEditOpen(true)}
                  onMouseEnter={preloadEditTripDialog}
                  onFocus={preloadEditTripDialog}
                  variant="outline"
                  className="h-10 px-4 rounded-xl border-input hover:bg-secondary"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit trip
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-lg text-muted-foreground mb-4">
            <MapPin className="w-5 h-5 shrink-0" />
            <span>{trip.destination}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Calendar className="w-5 h-5 shrink-0" />
            <span>{dateRange}</span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <RsvpBadge status={trip.userRsvpStatus} />
            {isOrganizer && (
              <Badge className="bg-gradient-to-r from-primary to-accent text-white">
                Organizing
              </Badge>
            )}
          </div>

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

          {/* Stats */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5" />
              <span className="text-sm">
                {trip.memberCount} member{trip.memberCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="w-5 h-5" />
              <span className="text-sm">
                {activeEventCount === 0
                  ? "No events yet"
                  : `${activeEventCount} event${activeEventCount === 1 ? "" : "s"}`}
              </span>
            </div>
          </div>

          {/* Description */}
          {trip.description && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                About this trip
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {trip.description}
              </p>
            </div>
          )}
        </div>

        {/* Itinerary and Members tabs */}
        <Tabs defaultValue="itinerary">
          <TabsList>
            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>
          <TabsContent value="itinerary">
            <ItineraryView tripId={tripId} />
          </TabsContent>
          <TabsContent value="members">
            <MembersList
              tripId={tripId}
              isOrganizer={isOrganizer}
              onInvite={() => setIsInviteOpen(true)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Trip Dialog */}
      {isOrganizer && trip && (
        <EditTripDialog
          trip={trip}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSuccess={() => {
            toast.success("Trip updated successfully");
          }}
        />
      )}

      {/* Invite Members Dialog */}
      {isOrganizer && (
        <InviteMembersDialog
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
          tripId={tripId}
        />
      )}
    </div>
  );
}
