"use client";

import { useMemo, useState } from "react";
import { Home, Car, Utensils, Calendar, Plane } from "lucide-react";
import type { Event, Accommodation, MemberTravel } from "@tripful/shared/types";
import { EventCard } from "./event-card";
import { AccommodationCard } from "./accommodation-card";
import { MemberTravelCard } from "./member-travel-card";
import { EditEventDialog } from "./edit-event-dialog";
import { EditAccommodationDialog } from "./edit-accommodation-dialog";
import { EditMemberTravelDialog } from "./edit-member-travel-dialog";

interface GroupByTypeViewProps {
  events: Event[];
  accommodations: Accommodation[];
  memberTravels: MemberTravel[];
  timezone: string;
  isOrganizer: boolean;
  userId: string;
  userNameMap: Map<string, string>;
  isLocked?: boolean;
}

export function GroupByTypeView({
  events,
  accommodations,
  memberTravels,
  timezone,
  isOrganizer,
  userId,
  userNameMap,
  isLocked,
}: GroupByTypeViewProps) {
  // Group events by type
  const groupedEvents = useMemo(() => {
    const travel: Event[] = [];
    const meal: Event[] = [];
    const activity: Event[] = [];

    for (const event of events) {
      if (event.eventType === "travel") travel.push(event);
      else if (event.eventType === "meal") meal.push(event);
      else if (event.eventType === "activity") activity.push(event);
    }

    const sortByStartTime = (a: Event, b: Event) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime();

    const arrivals = memberTravels
      .filter((t) => t.travelType === "arrival")
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const departures = memberTravels
      .filter((t) => t.travelType === "departure")
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return {
      accommodations: [...accommodations].sort(
        (a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime(),
      ),
      arrivals,
      departures,
      travel: travel.sort(sortByStartTime),
      meal: meal.sort(sortByStartTime),
      activity: activity.sort(sortByStartTime),
    };
  }, [events, accommodations, memberTravels]);

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

  const sections = useMemo(
    () => [
      {
        title: "Accommodations",
        icon: Home,
        iconClassName: "",
        color: "text-[var(--color-accommodation)]",
        bgColor: "bg-[var(--color-accommodation-light)]",
        items: groupedEvents.accommodations,
        type: "accommodation" as const,
      },
      {
        title: "Arrivals",
        icon: Plane,
        iconClassName: "rotate-90",
        color: "text-[var(--color-member-travel)]",
        bgColor: "bg-[var(--color-member-travel-light)]",
        items: groupedEvents.arrivals,
        type: "memberTravel" as const,
      },
      {
        title: "Travel",
        icon: Car,
        iconClassName: "",
        color: "text-[var(--color-event-travel)]",
        bgColor: "bg-[var(--color-event-travel-light)]",
        items: groupedEvents.travel,
        type: "event" as const,
      },
      {
        title: "Meals",
        icon: Utensils,
        iconClassName: "",
        color: "text-[var(--color-event-meal)]",
        bgColor: "bg-[var(--color-event-meal-light)]",
        items: groupedEvents.meal,
        type: "event" as const,
      },
      {
        title: "Activities",
        icon: Calendar,
        iconClassName: "",
        color: "text-[var(--color-event-activity)]",
        bgColor: "bg-[var(--color-event-activity-light)]",
        items: groupedEvents.activity,
        type: "event" as const,
      },
      {
        title: "Departures",
        icon: Plane,
        iconClassName: "-rotate-90",
        color: "text-[var(--color-member-travel)]",
        bgColor: "bg-[var(--color-member-travel-light)]",
        items: groupedEvents.departures,
        type: "memberTravel" as const,
      },
    ],
    [groupedEvents],
  );

  return (
    <div className="divide-y divide-border">
      {sections.map((section, index) => {
        const Icon = section.icon;
        return (
          <div
            key={section.title}
            className="grid grid-cols-[3.5rem_1fr] sm:grid-cols-[4rem_1fr] gap-x-3 py-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Icon gutter — outer cell stretches to row height so sticky works */}
            <div className="relative">
              <div className="sticky top-[7.75rem] z-10 flex flex-col items-center pt-3 bg-background">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${bgFor(section)} ${section.color}`}
                  title={section.title}
                >
                  <Icon className={`w-5 h-5 ${section.iconClassName}`} />
                </div>
              </div>
            </div>

            {/* Content column */}
            <div className="min-w-0">
              {section.items.length > 0 ? (
                <div className="space-y-2">
                  {section.type === "accommodation"
                    ? section.items.map((item) => (
                        <AccommodationCard
                          key={item.id}
                          accommodation={item as Accommodation}
                          timezone={timezone}
                          canEdit={canModifyAccommodation(
                            item as Accommodation,
                          )}
                          canDelete={canModifyAccommodation(
                            item as Accommodation,
                          )}
                          onEdit={() =>
                            setEditingAccommodation(item as Accommodation)
                          }
                          onDelete={() =>
                            setEditingAccommodation(item as Accommodation)
                          }
                          createdByName={userNameMap.get(
                            (item as Accommodation).createdBy,
                          )}
                          showDate
                        />
                      ))
                    : section.type === "memberTravel"
                      ? section.items.map((item) => {
                          const travel = item as MemberTravel;
                          return (
                            <MemberTravelCard
                              key={travel.id}
                              memberTravel={travel}
                              memberName={travel.memberName || "Unknown"}
                              timezone={timezone}
                              canEdit={canModifyMemberTravel(travel)}
                              canDelete={canModifyMemberTravel(travel)}
                              onEdit={() => setEditingMemberTravel(travel)}
                              onDelete={() => setEditingMemberTravel(travel)}
                              showDate
                            />
                          );
                        })
                      : section.items.map((item) => (
                          <EventCard
                            key={item.id}
                            event={item as Event}
                            timezone={timezone}
                            canEdit={canModifyEvent(item as Event)}
                            canDelete={canModifyEvent(item as Event)}
                            onEdit={() => setEditingEvent(item as Event)}
                            onDelete={() => setEditingEvent(item as Event)}
                            createdByName={userNameMap.get(
                              (item as Event).createdBy,
                            )}
                            showDate
                          />
                        ))}
                </div>
              ) : (
                <div className="flex items-center min-h-10 pl-5">
                  <p className="text-xs text-muted-foreground/60">
                    No {section.title.toLowerCase()} added yet
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}

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

/** Pick the right background for the icon circle */
function bgFor(section: { bgColor: string }) {
  return section.bgColor;
}
