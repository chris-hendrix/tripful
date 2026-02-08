"use client";

import { useMemo, useState } from "react";
import type { Event, Accommodation, MemberTravel } from "@tripful/shared/types";
import { EventCard } from "./event-card";
import { AccommodationCard } from "./accommodation-card";
import { MemberTravelCard } from "./member-travel-card";
import { EditEventDialog } from "./edit-event-dialog";
import { EditAccommodationDialog } from "./edit-accommodation-dialog";
import { EditMemberTravelDialog } from "./edit-member-travel-dialog";
import { getDayInTimezone, getDayLabel } from "@/lib/utils/timezone";

interface DayByDayViewProps {
  events: Event[];
  accommodations: Accommodation[];
  memberTravels: MemberTravel[];
  timezone: string;
  tripStartDate: string | null;
  tripEndDate: string | null;
  isOrganizer: boolean;
  userId: string;
  userNameMap: Map<string, string>;
}

interface DayData {
  date: string;
  label: string;
  events: Event[];
  accommodation: Accommodation | null;
  arrivals: MemberTravel[];
  departures: MemberTravel[];
}

export function DayByDayView({
  events,
  accommodations,
  memberTravels,
  timezone,
  tripStartDate,
  tripEndDate,
  isOrganizer,
  userId,
  userNameMap,
}: DayByDayViewProps) {
  // Group data by day
  const dayData = useMemo(() => {
    const days = new Map<string, DayData>();

    // Initialize days with trip date range
    if (tripStartDate && tripEndDate) {
      const start = new Date(tripStartDate + "T00:00:00");
      const end = new Date(tripEndDate + "T00:00:00");
      const current = new Date(start);

      while (current <= end) {
        const dateString = current.toISOString().split("T")[0] || "";
        if (!dateString) continue;
        days.set(dateString, {
          date: dateString,
          label: getDayLabel(dateString, timezone),
          events: [],
          accommodation: null,
          arrivals: [],
          departures: [],
        });
        current.setDate(current.getDate() + 1);
      }
    }

    // Add events to days
    events.forEach((event) => {
      const day = getDayInTimezone(event.startTime, timezone);
      if (!days.has(day)) {
        days.set(day, {
          date: day,
          label: getDayLabel(day, timezone),
          events: [],
          accommodation: null,
          arrivals: [],
          departures: [],
        });
      }
      days.get(day)!.events.push(event);
    });

    // Add accommodations to days (show on check-in day)
    accommodations.forEach((acc) => {
      if (!days.has(acc.checkIn)) {
        days.set(acc.checkIn, {
          date: acc.checkIn,
          label: getDayLabel(acc.checkIn, timezone),
          events: [],
          accommodation: null,
          arrivals: [],
          departures: [],
        });
      }
      days.get(acc.checkIn)!.accommodation = acc;
    });

    // Add member travels to days
    memberTravels.forEach((travel) => {
      const day = getDayInTimezone(travel.time, timezone);
      if (!days.has(day)) {
        days.set(day, {
          date: day,
          label: getDayLabel(day, timezone),
          events: [],
          accommodation: null,
          arrivals: [],
          departures: [],
        });
      }
      if (travel.travelType === "arrival") {
        days.get(day)!.arrivals.push(travel);
      } else {
        days.get(day)!.departures.push(travel);
      }
    });

    // Sort days
    const sortedDays = Array.from(days.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Sort events within each day (all-day events first, then by time)
    sortedDays.forEach((day) => {
      day.events.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

      // Sort travels by time
      day.arrivals.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      day.departures.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    });

    return sortedDays;
  }, [
    events,
    accommodations,
    memberTravels,
    timezone,
    tripStartDate,
    tripEndDate,
  ]);

  // Check permissions
  const canModifyEvent = (event: Event) => {
    return isOrganizer || event.createdBy === userId;
  };

  const canModifyAccommodation = (accommodation: Accommodation) => {
    return isOrganizer || accommodation.createdBy === userId;
  };

  const canModifyMemberTravel = (travel: MemberTravel) => {
    return isOrganizer || travel.memberId === userId;
  };

  // Edit dialog state
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingAccommodation, setEditingAccommodation] =
    useState<Accommodation | null>(null);
  const [editingMemberTravel, setEditingMemberTravel] =
    useState<MemberTravel | null>(null);

  return (
    <div className="space-y-6">
      {dayData.map((day, index) => {
        const hasContent =
          day.events.length > 0 ||
          day.accommodation ||
          day.arrivals.length > 0 ||
          day.departures.length > 0;

        return (
          <div
            key={day.date}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Day header */}
            <h2 className="text-2xl font-bold text-foreground mb-4 font-[family-name:var(--font-playfair)]">
              {day.label}
            </h2>

            {hasContent ? (
              <div className="space-y-3">
                {/* Accommodation */}
                {day.accommodation && (
                  <AccommodationCard
                    accommodation={day.accommodation}
                    timezone={timezone}
                    canEdit={canModifyAccommodation(day.accommodation)}
                    canDelete={canModifyAccommodation(day.accommodation)}
                    onEdit={() => setEditingAccommodation(day.accommodation)}
                    onDelete={() => setEditingAccommodation(day.accommodation)}
                    createdByName={userNameMap.get(day.accommodation.createdBy)}
                  />
                )}

                {/* Arrivals */}
                {day.arrivals.map((travel) => (
                  <MemberTravelCard
                    key={travel.id}
                    memberTravel={travel}
                    memberName={travel.memberName || "Unknown member"}
                    timezone={timezone}
                    canEdit={canModifyMemberTravel(travel)}
                    canDelete={canModifyMemberTravel(travel)}
                    onEdit={() => setEditingMemberTravel(travel)}
                    // Delete is triggered through the edit dialog which contains the delete flow
                    onDelete={() => setEditingMemberTravel(travel)}
                  />
                ))}

                {/* Events */}
                {day.events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    timezone={timezone}
                    canEdit={canModifyEvent(event)}
                    canDelete={canModifyEvent(event)}
                    onEdit={() => setEditingEvent(event)}
                    onDelete={() => setEditingEvent(event)}
                    createdByName={userNameMap.get(event.createdBy)}
                  />
                ))}

                {/* Departures */}
                {day.departures.map((travel) => (
                  <MemberTravelCard
                    key={travel.id}
                    memberTravel={travel}
                    memberName={travel.memberName || "Unknown member"}
                    timezone={timezone}
                    canEdit={canModifyMemberTravel(travel)}
                    canDelete={canModifyMemberTravel(travel)}
                    onEdit={() => setEditingMemberTravel(travel)}
                    // Delete is triggered through the edit dialog which contains the delete flow
                    onDelete={() => setEditingMemberTravel(travel)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No events or activities scheduled for this day
                </p>
              </div>
            )}
          </div>
        );
      })}

      {dayData.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">
            No trip dates set. Set trip dates to see a day-by-day view.
          </p>
        </div>
      )}

      {/* Edit dialogs */}
      {editingEvent && (
        <EditEventDialog
          open={!!editingEvent}
          onOpenChange={(open) => {
            if (!open) setEditingEvent(null);
          }}
          event={editingEvent}
          timezone={timezone}
        />
      )}
      {editingAccommodation && (
        <EditAccommodationDialog
          open={!!editingAccommodation}
          onOpenChange={(open) => {
            if (!open) setEditingAccommodation(null);
          }}
          accommodation={editingAccommodation}
        />
      )}
      {editingMemberTravel && (
        <EditMemberTravelDialog
          open={!!editingMemberTravel}
          onOpenChange={(open) => {
            if (!open) setEditingMemberTravel(null);
          }}
          memberTravel={editingMemberTravel}
          timezone={timezone}
        />
      )}
    </div>
  );
}
