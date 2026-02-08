"use client";

import { useState } from "react";
import { Calendar, List, Globe, Plus, Building2, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { CreateEventDialog } from "./create-event-dialog";
import { CreateAccommodationDialog } from "./create-accommodation-dialog";
import { CreateMemberTravelDialog } from "./create-member-travel-dialog";

function getTimezoneLabel(tz: string): string {
  const parts = tz.split("/");
  const lastPart = parts[parts.length - 1];
  return lastPart ? lastPart.replace(/_/g, " ") : tz;
}

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

  const [fabOpen, setFabOpen] = useState(false);

  const tripLabel = getTimezoneLabel(tripTimezone);
  const userLabel = getTimezoneLabel(userTimezone);

  // Permission checks
  const canAddEvent = isOrganizer || (isMember && allowMembersToAddEvents);
  const hasAnyAction = canAddEvent || isOrganizer || isMember;

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

            {/* Right side: Timezone toggle */}
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
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      {hasAnyAction && (
        <DropdownMenu open={fabOpen} onOpenChange={setFabOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="gradient"
              className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg"
              aria-label="Add to itinerary"
            >
              <Plus
                className={`w-6 h-6 transition-transform duration-200 ${fabOpen ? "rotate-45" : ""}`}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-48">
            {canAddEvent && (
              <DropdownMenuItem
                onSelect={() => setIsCreateEventOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Event
              </DropdownMenuItem>
            )}
            {isOrganizer && (
              <DropdownMenuItem
                onSelect={() => setIsCreateAccommodationOpen(true)}
              >
                <Building2 className="w-4 h-4" />
                Accommodation
              </DropdownMenuItem>
            )}
            {isMember && (
              <DropdownMenuItem
                onSelect={() => setIsCreateMemberTravelOpen(true)}
              >
                <Plane className="w-4 h-4" />
                My Travel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

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
