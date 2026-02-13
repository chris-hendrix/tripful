"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { Event, Accommodation, MemberTravel } from "@tripful/shared/types";
import { EventCard } from "./event-card";
import { AccommodationCard } from "./accommodation-card";
import { MemberTravelCard } from "./member-travel-card";
import { EditEventDialog } from "./edit-event-dialog";
import { EditAccommodationDialog } from "./edit-accommodation-dialog";
import { EditMemberTravelDialog } from "./edit-member-travel-dialog";
import {
  getDayInTimezone,
  getDayLabel,
  getDayNumber,
  getMonthAbbrev,
  getWeekdayAbbrev,
} from "@/lib/utils/timezone";
import { cn } from "@/lib/utils";

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
  isLocked?: boolean;
}

interface DayData {
  date: string;
  label: string;
  events: Event[];
  accommodation: Accommodation | null;
  arrivals: MemberTravel[];
  departures: MemberTravel[];
}

function NowIndicator() {
  return (
    <div className="relative flex items-center py-0.5" aria-hidden="true">
      <div className="absolute left-0 h-2.5 w-2.5 rounded-full bg-primary" />
      <div className="ml-2 w-full border-t-2 border-primary" />
    </div>
  );
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
  isLocked,
}: DayByDayViewProps) {
  // Track current time for the "now" indicator
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const todayString = useMemo(
    () => getDayInTimezone(new Date(now), timezone),
    [now, timezone],
  );

  // Group data by day
  const dayData = useMemo(() => {
    const days = new Map<string, DayData>();

    const ensureDay = (dateString: string) => {
      if (!days.has(dateString)) {
        days.set(dateString, {
          date: dateString,
          label: getDayLabel(dateString, timezone),
          events: [],
          accommodation: null,
          arrivals: [],
          departures: [],
        });
      }
    };

    // Add events to days
    events.forEach((event) => {
      const day = getDayInTimezone(event.startTime, timezone);
      ensureDay(day);
      days.get(day)!.events.push(event);
    });

    // Add accommodations to days (show on check-in day)
    accommodations.forEach((acc) => {
      ensureDay(acc.checkIn);
      days.get(acc.checkIn)!.accommodation = acc;
    });

    // Add member travels to days
    memberTravels.forEach((travel) => {
      const day = getDayInTimezone(travel.time, timezone);
      ensureDay(day);
      if (travel.travelType === "arrival") {
        days.get(day)!.arrivals.push(travel);
      } else {
        days.get(day)!.departures.push(travel);
      }
    });

    // Compute the full date range: min(tripStart, earliest item) to max(tripEnd, latest item)
    const allDates = Array.from(days.keys());
    if (tripStartDate) allDates.push(tripStartDate);
    if (tripEndDate) allDates.push(tripEndDate);

    if (allDates.length > 0) {
      allDates.sort();
      const rangeStart = allDates[0]!;
      const rangeEnd = allDates[allDates.length - 1]!;

      const current = new Date(rangeStart + "T00:00:00");
      const end = new Date(rangeEnd + "T00:00:00");
      while (current <= end) {
        const dateString = current.toISOString().split("T")[0] || "";
        if (dateString) ensureDay(dateString);
        current.setDate(current.getDate() + 1);
      }
    }

    // Sort days
    const sortedDays = Array.from(days.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Sort events within each day (all-day events first, then by time)
    sortedDays.forEach((day) => {
      day.events.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return (
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
      });

      // Sort travels by time
      day.arrivals.sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      );
      day.departures.sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      );
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
    if (isLocked) return false;
    return isOrganizer || event.createdBy === userId;
  };

  const canModifyAccommodation = (accommodation: Accommodation) => {
    if (isLocked) return false;
    return isOrganizer || accommodation.createdBy === userId;
  };

  const canModifyMemberTravel = (travel: MemberTravel) => {
    if (isLocked) return false;
    return isOrganizer || travel.memberId === userId;
  };

  // Edit dialog state
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingAccommodation, setEditingAccommodation] =
    useState<Accommodation | null>(null);
  const [editingMemberTravel, setEditingMemberTravel] =
    useState<MemberTravel | null>(null);

  return (
    <div className="divide-y divide-border">
      {dayData.map((day, index) => {
        const isToday = day.date === todayString;
        const hasContent =
          day.events.length > 0 ||
          day.accommodation ||
          day.arrivals.length > 0 ||
          day.departures.length > 0;

        // Build the ordered list of card elements for this day,
        // inserting the "now" line at the right position for today
        const cardElements: ReactNode[] = [];
        let nowInserted = false;

        const maybeInsertNow = (itemTime: string | Date) => {
          if (!isToday || nowInserted) return;
          const t =
            typeof itemTime === "string"
              ? new Date(itemTime).getTime()
              : itemTime.getTime();
          if (now < t) {
            cardElements.push(<NowIndicator key="now-line" />);
            nowInserted = true;
          }
        };

        // Accommodation
        if (day.accommodation) {
          // Accommodation doesn't have a start time, show it first
          cardElements.push(
            <AccommodationCard
              key={`acc-${day.accommodation.id}`}
              accommodation={day.accommodation}
              timezone={timezone}
              canEdit={canModifyAccommodation(day.accommodation)}
              canDelete={canModifyAccommodation(day.accommodation)}
              onEdit={() => setEditingAccommodation(day.accommodation)}
              onDelete={() => setEditingAccommodation(day.accommodation)}
              createdByName={userNameMap.get(day.accommodation.createdBy)}
            />,
          );
        }

        // Arrivals
        day.arrivals.forEach((travel) => {
          maybeInsertNow(travel.time);
          cardElements.push(
            <MemberTravelCard
              key={travel.id}
              memberTravel={travel}
              memberName={travel.memberName || "Unknown member"}
              timezone={timezone}
              canEdit={canModifyMemberTravel(travel)}
              canDelete={canModifyMemberTravel(travel)}
              onEdit={() => setEditingMemberTravel(travel)}
              onDelete={() => setEditingMemberTravel(travel)}
            />,
          );
        });

        // Events
        day.events.forEach((event) => {
          if (!event.allDay) {
            maybeInsertNow(event.startTime);
          }
          cardElements.push(
            <EventCard
              key={event.id}
              event={event}
              timezone={timezone}
              canEdit={canModifyEvent(event)}
              canDelete={canModifyEvent(event)}
              onEdit={() => setEditingEvent(event)}
              onDelete={() => setEditingEvent(event)}
              createdByName={userNameMap.get(event.createdBy)}
            />,
          );
        });

        // Departures
        day.departures.forEach((travel) => {
          maybeInsertNow(travel.time);
          cardElements.push(
            <MemberTravelCard
              key={travel.id}
              memberTravel={travel}
              memberName={travel.memberName || "Unknown member"}
              timezone={timezone}
              canEdit={canModifyMemberTravel(travel)}
              canDelete={canModifyMemberTravel(travel)}
              onEdit={() => setEditingMemberTravel(travel)}
              onDelete={() => setEditingMemberTravel(travel)}
            />,
          );
        });

        // If today and "now" hasn't been inserted yet (all events are in the past
        // or there are no events), put the indicator at the end
        if (isToday && !nowInserted) {
          cardElements.push(<NowIndicator key="now-line" />);
        }

        return (
          <div
            key={day.date}
            className={cn(
              "grid grid-cols-[3.5rem_1fr] sm:grid-cols-[4rem_1fr] gap-x-3 py-4",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 duration-500",
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Date gutter — outer cell stretches to row height so sticky works */}
            <div className="relative">
              <div className="sticky top-[7.75rem] z-10 flex flex-col items-center pt-3 bg-background">
                <span
                  className={cn(
                    "text-xs font-medium uppercase",
                    isToday ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {getMonthAbbrev(day.date, timezone)}
                </span>
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-2xl font-bold leading-none",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground",
                  )}
                >
                  {getDayNumber(day.date)}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium uppercase",
                    isToday ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {getWeekdayAbbrev(day.date, timezone)}
                </span>
              </div>
            </div>

            {/* Content column */}
            <div className="min-w-0">
              <div className="space-y-2">
                {cardElements}
                {!hasContent && !isToday && (
                  <div className="flex items-center min-h-[4.5rem] pl-5">
                    <p className="text-xs text-muted-foreground/60">
                      No events scheduled
                    </p>
                  </div>
                )}
              </div>
            </div>
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
