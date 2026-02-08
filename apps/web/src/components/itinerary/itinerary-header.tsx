"use client";

import { useState } from "react";
import { Calendar, List, Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CreateEventDialog,
  CreateAccommodationDialog,
  CreateMemberTravelDialog,
} from "@/components/itinerary";

interface ItineraryHeaderProps {
  viewMode: "day-by-day" | "group-by-type";
  onViewModeChange: (mode: "day-by-day" | "group-by-type") => void;
  showUserTime: boolean;
  onShowUserTimeChange: (show: boolean) => void;
  tripTimezone: string;
  userTimezone: string;
  tripId: string;
  isOrganizer: boolean;
  isMember: boolean;
  allowMembersToAddEvents: boolean;
}

export function ItineraryHeader({
  viewMode,
  onViewModeChange,
  showUserTime,
  onShowUserTimeChange,
  tripTimezone,
  userTimezone,
  tripId,
  isOrganizer,
  isMember,
  allowMembersToAddEvents,
}: ItineraryHeaderProps) {
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isCreateAccommodationOpen, setIsCreateAccommodationOpen] =
    useState(false);
  const [isCreateMemberTravelOpen, setIsCreateMemberTravelOpen] =
    useState(false);

  // Extract timezone name for display (e.g., "America/New_York" -> "New York")
  const getTimezoneLabel = (tz: string) => {
    const parts = tz.split("/");
    const lastPart = parts[parts.length - 1];
    return lastPart ? lastPart.replace(/_/g, " ") : tz;
  };

  const tripLabel = getTimezoneLabel(tripTimezone);
  const userLabel = getTimezoneLabel(userTimezone);

  // Permission checks
  const canAddEvent = isOrganizer || (isMember && allowMembersToAddEvents);

  return (
    <>
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left side: View mode toggle */}
            <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-xl border border-border">
              <Button
                size="sm"
                variant={viewMode === "day-by-day" ? "default" : "ghost"}
                onClick={() => onViewModeChange("day-by-day")}
                className="h-8 px-3 rounded-lg"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Day by Day
              </Button>
              <Button
                size="sm"
                variant={viewMode === "group-by-type" ? "default" : "ghost"}
                onClick={() => onViewModeChange("group-by-type")}
                className="h-8 px-3 rounded-lg"
              >
                <List className="w-4 h-4 mr-2" />
                Group by Type
              </Button>
            </div>

            {/* Right side: Timezone toggle and action buttons */}
            <div className="flex items-center gap-3">
              {/* Timezone toggle */}
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-xl border border-border">
                  <Button
                    size="sm"
                    variant={!showUserTime ? "default" : "ghost"}
                    onClick={() => onShowUserTimeChange(false)}
                    className="h-8 px-3 rounded-lg text-xs"
                    title={`Trip timezone: ${tripTimezone}`}
                  >
                    Trip ({tripLabel})
                  </Button>
                  <Button
                    size="sm"
                    variant={showUserTime ? "default" : "ghost"}
                    onClick={() => onShowUserTimeChange(true)}
                    className="h-8 px-3 rounded-lg text-xs"
                    title={`Your timezone: ${userTimezone}`}
                  >
                    Your ({userLabel})
                  </Button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {canAddEvent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCreateEventOpen(true)}
                    className="h-8 px-3 rounded-lg"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Event
                  </Button>
                )}
                {isOrganizer && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCreateAccommodationOpen(true)}
                    className="h-8 px-3 rounded-lg"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Accommodation
                  </Button>
                )}
                {isMember && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCreateMemberTravelOpen(true)}
                    className="h-8 px-3 rounded-lg"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    My Travel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateEventDialog
        open={isCreateEventOpen}
        onOpenChange={setIsCreateEventOpen}
        tripId={tripId}
      />
      <CreateAccommodationDialog
        open={isCreateAccommodationOpen}
        onOpenChange={setIsCreateAccommodationOpen}
        tripId={tripId}
      />
      <CreateMemberTravelDialog
        open={isCreateMemberTravelOpen}
        onOpenChange={setIsCreateMemberTravelOpen}
        tripId={tripId}
      />
    </>
  );
}
