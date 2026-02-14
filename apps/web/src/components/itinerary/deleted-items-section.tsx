"use client";

import { useMemo, useState, useEffect } from "react";
import { ChevronDown, ChevronRight, RotateCcw, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useEventsWithDeleted,
  useRestoreEvent,
  getRestoreEventErrorMessage,
} from "@/hooks/use-events";
import {
  useAccommodationsWithDeleted,
  useRestoreAccommodation,
  getRestoreAccommodationErrorMessage,
} from "@/hooks/use-accommodations";
import {
  useMemberTravelsWithDeleted,
  useRestoreMemberTravel,
  getRestoreMemberTravelErrorMessage,
} from "@/hooks/use-member-travel";
import { formatInTimezone } from "@/lib/utils/timezone";
import type { Event, Accommodation, MemberTravel } from "@tripful/shared/types";

interface DeletedItemsSectionProps {
  tripId: string;
  timezone: string;
}

export function DeletedItemsSection({
  tripId,
  timezone,
}: DeletedItemsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch all items including deleted
  const { data: allEvents = [] } = useEventsWithDeleted(tripId);
  const { data: allAccommodations = [] } =
    useAccommodationsWithDeleted(tripId);
  const { data: allMemberTravels = [] } =
    useMemberTravelsWithDeleted(tripId);

  // Restore mutations
  const restoreEvent = useRestoreEvent();
  const restoreAccommodation = useRestoreAccommodation();
  const restoreMemberTravel = useRestoreMemberTravel();

  // Filter to only deleted items
  const deletedEvents = useMemo(
    () => allEvents.filter((e) => e.deletedAt !== null),
    [allEvents],
  );
  const deletedAccommodations = useMemo(
    () => allAccommodations.filter((a) => a.deletedAt !== null),
    [allAccommodations],
  );
  const deletedMemberTravels = useMemo(
    () => allMemberTravels.filter((mt) => mt.deletedAt !== null),
    [allMemberTravels],
  );

  const totalDeleted =
    deletedEvents.length +
    deletedAccommodations.length +
    deletedMemberTravels.length;

  // Auto-collapse when no more deleted items
  useEffect(() => {
    if (totalDeleted === 0) {
      setIsExpanded(false);
    }
  }, [totalDeleted]);

  // Don't render if no deleted items
  if (totalDeleted === 0) {
    return null;
  }

  const handleRestoreEvent = (eventId: string) => {
    restoreEvent.mutate(eventId, {
      onSuccess: () => {
        toast.success("Event restored");
      },
      onError: (error) => {
        toast.error(
          getRestoreEventErrorMessage(error) ?? "Failed to restore event",
        );
      },
    });
  };

  const handleRestoreAccommodation = (accommodationId: string) => {
    restoreAccommodation.mutate(accommodationId, {
      onSuccess: () => {
        toast.success("Accommodation restored");
      },
      onError: (error) => {
        toast.error(
          getRestoreAccommodationErrorMessage(error) ??
            "Failed to restore accommodation",
        );
      },
    });
  };

  const handleRestoreMemberTravel = (memberTravelId: string) => {
    restoreMemberTravel.mutate(memberTravelId, {
      onSuccess: () => {
        toast.success("Travel details restored");
      },
      onError: (error) => {
        toast.error(
          getRestoreMemberTravelErrorMessage(error) ??
            "Failed to restore travel details",
        );
      },
    });
  };

  return (
    <div className="mt-8 border border-border rounded-xl bg-card">
      {/* Toggle header */}
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <Trash2 className="h-4 w-4 shrink-0" />
        <span>
          Deleted Items ({totalDeleted})
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border px-4 pb-4">
          {/* Deleted Events */}
          {deletedEvents.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Events
              </h4>
              <div className="space-y-2">
                {deletedEvents.map((event) => (
                  <DeletedEventRow
                    key={event.id}
                    event={event}
                    timezone={timezone}
                    onRestore={handleRestoreEvent}
                    isRestoring={
                      restoreEvent.isPending &&
                      restoreEvent.variables === event.id
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Deleted Accommodations */}
          {deletedAccommodations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Accommodations
              </h4>
              <div className="space-y-2">
                {deletedAccommodations.map((accommodation) => (
                  <DeletedAccommodationRow
                    key={accommodation.id}
                    accommodation={accommodation}
                    timezone={timezone}
                    onRestore={handleRestoreAccommodation}
                    isRestoring={
                      restoreAccommodation.isPending &&
                      restoreAccommodation.variables === accommodation.id
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Deleted Member Travels */}
          {deletedMemberTravels.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Member Travel
              </h4>
              <div className="space-y-2">
                {deletedMemberTravels.map((memberTravel) => (
                  <DeletedMemberTravelRow
                    key={memberTravel.id}
                    memberTravel={memberTravel}
                    timezone={timezone}
                    onRestore={handleRestoreMemberTravel}
                    isRestoring={
                      restoreMemberTravel.isPending &&
                      restoreMemberTravel.variables === memberTravel.id
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Row sub-components ---

function DeletedEventRow({
  event,
  timezone,
  onRestore,
  isRestoring,
}: {
  event: Event;
  timezone: string;
  onRestore: (id: string) => void;
  isRestoring: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {event.name}
        </p>
        <p className="text-xs text-muted-foreground">
          Deleted{" "}
          {event.deletedAt
            ? formatInTimezone(event.deletedAt, timezone, "datetime")
            : ""}
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0 text-xs">
        {event.eventType}
      </Badge>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs shrink-0"
        onClick={() => onRestore(event.id)}
        disabled={isRestoring}
      >
        {isRestoring ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <RotateCcw className="h-3 w-3 mr-1" />
        )}
        Restore
      </Button>
    </div>
  );
}

function DeletedAccommodationRow({
  accommodation,
  timezone,
  onRestore,
  isRestoring,
}: {
  accommodation: Accommodation;
  timezone: string;
  onRestore: (id: string) => void;
  isRestoring: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {accommodation.name}
        </p>
        <p className="text-xs text-muted-foreground">
          Deleted{" "}
          {accommodation.deletedAt
            ? formatInTimezone(accommodation.deletedAt, timezone, "datetime")
            : ""}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs shrink-0"
        onClick={() => onRestore(accommodation.id)}
        disabled={isRestoring}
      >
        {isRestoring ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <RotateCcw className="h-3 w-3 mr-1" />
        )}
        Restore
      </Button>
    </div>
  );
}

function DeletedMemberTravelRow({
  memberTravel,
  timezone,
  onRestore,
  isRestoring,
}: {
  memberTravel: MemberTravel;
  timezone: string;
  onRestore: (id: string) => void;
  isRestoring: boolean;
}) {
  const label =
    memberTravel.memberName
      ? `${memberTravel.memberName} - ${memberTravel.travelType}`
      : memberTravel.travelType;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate capitalize">
          {label}
        </p>
        <p className="text-xs text-muted-foreground">
          Deleted{" "}
          {memberTravel.deletedAt
            ? formatInTimezone(memberTravel.deletedAt, timezone, "datetime")
            : ""}
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0 text-xs capitalize">
        {memberTravel.travelType}
      </Badge>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs shrink-0"
        onClick={() => onRestore(memberTravel.id)}
        disabled={isRestoring}
      >
        {isRestoring ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <RotateCcw className="h-3 w-3 mr-1" />
        )}
        Restore
      </Button>
    </div>
  );
}
