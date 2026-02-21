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
  ImagePlus,
  UserPlus,
  Pencil,
} from "lucide-react";
import { useTripDetail } from "@/hooks/use-trips";
import { useEvents } from "@/hooks/use-events";
import {
  useRemoveMember,
  getRemoveMemberErrorMessage,
  useUpdateMemberRole,
  getUpdateMemberRoleErrorMessage,
  useMembers,
} from "@/hooks/use-invitations";
import type { MemberWithProfile } from "@/hooks/use-invitations";
import { useAuth } from "@/app/providers/auth-provider";
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
import { getUploadUrl } from "@/lib/api";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ItineraryView } from "@/components/itinerary/itinerary-view";
import { TripMessages, MessageCountIndicator } from "@/components/messaging";
import {
  TripNotificationBell,
  TripSettingsButton,
} from "@/components/notifications";
import { ErrorBoundary } from "@/components/error-boundary";
import { MembersList } from "@/components/trip/members-list";
import { TripPreview } from "@/components/trip/trip-preview";

const EditTripDialog = dynamic(() =>
  import("@/components/trip/edit-trip-dialog").then((mod) => ({
    default: mod.EditTripDialog,
  })),
);

const preloadEditTripDialog = () =>
  void import("@/components/trip/edit-trip-dialog");

const InviteMembersDialog = dynamic(() =>
  import("@/components/trip/invite-members-dialog").then((mod) => ({
    default: mod.InviteMembersDialog,
  })),
);

const preloadInviteMembersDialog = () =>
  void import("@/components/trip/invite-members-dialog");

const MemberOnboardingWizard = dynamic(() =>
  import("@/components/trip/member-onboarding-wizard").then((mod) => ({
    default: mod.MemberOnboardingWizard,
  })),
);

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
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<{
    member: MemberWithProfile;
  } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const removeMember = useRemoveMember(tripId);
  const updateRole = useUpdateMemberRole(tripId);
  const { user } = useAuth();
  const { data: members } = useMembers(tripId);
  const currentMember = members?.find((m) => m.userId === user?.id);

  const handleUpdateRole = (
    member: MemberWithProfile,
    isOrganizer: boolean,
  ) => {
    updateRole.mutate(
      { memberId: member.id, isOrganizer },
      {
        onSuccess: () => {
          toast.success(
            isOrganizer
              ? `${member.displayName} is now a co-organizer`
              : `${member.displayName} is no longer a co-organizer`,
          );
        },
        onError: (error) => {
          const message = getUpdateMemberRoleErrorMessage(error);
          toast.error(message ?? "Failed to update member role");
        },
      },
    );
  };

  // Compute active event count (filter out soft-deleted events for safety)
  const activeEventCount = events?.filter((e) => !e.deletedAt).length ?? 0;

  // Determine if user is an organizer (from API response metadata)
  const isOrganizer = trip?.isOrganizer ?? false;

  // Check if trip is locked (past end date)
  const isLocked = trip?.endDate
    ? new Date(`${trip.endDate}T23:59:59.999Z`) < new Date()
    : false;

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
            <Link href="/trips">Return to trips</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Preview mode: show limited trip info with RSVP buttons
  if (trip.isPreview) {
    return (
      <TripPreview
        trip={trip}
        tripId={tripId}
        onGoingSuccess={() => setShowOnboarding(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb navigation */}
      <Breadcrumb className="max-w-5xl mx-auto px-4 pt-6 pb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/trips">My Trips</Link>
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
            src={getUploadUrl(trip.coverImageUrl)!}
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
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl sm:text-4xl font-bold text-foreground font-[family-name:var(--font-playfair)]">
              {trip.name}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <TripNotificationBell tripId={tripId} />
              <TripSettingsButton tripId={tripId} />
            </div>
          </div>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destination)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-lg text-muted-foreground hover:text-foreground transition-colors mb-4 w-fit"
          >
            <MapPin className="w-5 h-5 shrink-0" />
            <span>{trip.destination}</span>
          </a>

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

          {/* Organizer actions */}
          {isOrganizer && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mb-6">
              <span className="text-sm text-muted-foreground">
                You&apos;re organizing this trip
              </span>
              <span className="text-border">|</span>
              <button
                onClick={() => setIsInviteOpen(true)}
                onMouseEnter={preloadInviteMembersDialog}
                onFocus={preloadInviteMembersDialog}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Invite
              </button>
              <button
                onClick={() => setIsEditOpen(true)}
                onMouseEnter={preloadEditTripDialog}
                onFocus={preloadEditTripDialog}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit trip
              </button>
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
                        src={getUploadUrl(org.profilePhotoUrl)!}
                        alt={org.displayName}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full ring-2 ring-white object-cover"
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
            <button
              onClick={() => setIsMembersOpen(true)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Users className="w-5 h-5" />
              <span className="text-sm">
                {trip.memberCount} member{trip.memberCount !== 1 ? "s" : ""}
              </span>
            </button>
            <button
              onClick={() => {
                const target =
                  document.getElementById("day-today") ??
                  document.getElementById("itinerary");
                target?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ClipboardList className="w-5 h-5" />
              <span className="text-sm">
                {activeEventCount === 0
                  ? "No events yet"
                  : `${activeEventCount} event${activeEventCount === 1 ? "" : "s"}`}
              </span>
            </button>
            <MessageCountIndicator tripId={tripId} />
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

        {/* Itinerary */}
        <div id="itinerary" className="scroll-mt-14">
          <ItineraryView
            tripId={tripId}
            onAddTravel={() => setShowOnboarding(true)}
          />
        </div>

        {/* Discussion */}
        <div className="border-t border-border mt-6 pt-6">
          <ErrorBoundary>
            <TripMessages
              tripId={tripId}
              isOrganizer={isOrganizer}
              disabled={isLocked}
              isMuted={currentMember?.isMuted}
            />
          </ErrorBoundary>
        </div>
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

      {/* Members Sheet */}
      <Sheet
        open={isMembersOpen}
        onOpenChange={(open) => {
          setIsMembersOpen(open);
          if (!open) setRemovingMember(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="text-3xl font-[family-name:var(--font-playfair)] tracking-tight">
              {removingMember ? "Remove member" : "Members"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {removingMember
                ? "Confirm member removal"
                : "Trip members and invitations"}
            </SheetDescription>
          </SheetHeader>

          <SheetBody>
            {removingMember ? (
              <div className="flex flex-col flex-1">
                <div className="flex-1">
                  <p className="text-muted-foreground">
                    Are you sure you want to remove{" "}
                    <span className="font-medium text-foreground">
                      {removingMember.member.displayName}
                    </span>{" "}
                    from this trip? This will remove their membership and any
                    associated invitation.
                  </p>
                </div>
                <div className="flex gap-3 justify-end mt-auto pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setRemovingMember(null)}
                    disabled={removeMember.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={removeMember.isPending}
                    onClick={() => {
                      removeMember.mutate(removingMember.member.id, {
                        onSuccess: () => {
                          toast.success(
                            `${removingMember.member.displayName} has been removed`,
                          );
                          setRemovingMember(null);
                        },
                        onError: (error) => {
                          const message = getRemoveMemberErrorMessage(error);
                          toast.error(message ?? "Failed to remove member");
                          setRemovingMember(null);
                        },
                      });
                    }}
                  >
                    {removeMember.isPending ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </div>
            ) : (
              <MembersList
                tripId={tripId}
                isOrganizer={isOrganizer}
                createdBy={trip.createdBy}
                currentUserId={user?.id}
                onInvite={() => {
                  setIsMembersOpen(false);
                  setIsInviteOpen(true);
                }}
                onRemove={(member) => setRemovingMember({ member })}
                onUpdateRole={handleUpdateRole}
              />
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {showOnboarding && (
        <MemberOnboardingWizard
          open={showOnboarding}
          onOpenChange={setShowOnboarding}
          tripId={tripId}
          trip={trip}
        />
      )}
    </div>
  );
}
