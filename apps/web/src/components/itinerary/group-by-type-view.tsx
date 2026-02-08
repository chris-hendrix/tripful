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
}

export function GroupByTypeView({
  events,
  accommodations,
  memberTravels,
  timezone,
  isOrganizer,
  userId,
  userNameMap,
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
        (a, b) =>
          new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime(),
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

  const sections = useMemo(() => [
    {
      title: "Accommodations",
      icon: Home,
      iconClassName: "",
      color: "text-[var(--color-accommodation)]",
      items: groupedEvents.accommodations,
      type: "accommodation" as const,
    },
    {
      title: "Arrivals",
      icon: Plane,
      iconClassName: "",
      color: "text-[var(--color-arrival)]",
      items: groupedEvents.arrivals,
      type: "memberTravel" as const,
    },
    {
      title: "Departures",
      icon: Plane,
      iconClassName: "rotate-45",
      color: "text-[var(--color-departure)]",
      items: groupedEvents.departures,
      type: "memberTravel" as const,
    },
    {
      title: "Travel",
      icon: Car,
      iconClassName: "",
      color: "text-[var(--color-event-travel)]",
      items: groupedEvents.travel,
      type: "event" as const,
    },
    {
      title: "Meals",
      icon: Utensils,
      iconClassName: "",
      color: "text-[var(--color-event-meal)]",
      items: groupedEvents.meal,
      type: "event" as const,
    },
    {
      title: "Activities",
      icon: Calendar,
      iconClassName: "",
      color: "text-[var(--color-event-activity)]",
      items: groupedEvents.activity,
      type: "event" as const,
    },
  ], [groupedEvents]);

  return (
    <div className="space-y-8">
      {sections.map((section, index) => {
        const Icon = section.icon;
        return (
          <div
            key={section.title}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg bg-muted ${section.color}`}>
                <Icon className={`w-5 h-5 ${section.iconClassName}`} />
              </div>
              <h3 className="text-xl font-semibold text-foreground font-[family-name:var(--font-playfair)]">
                {section.title}
              </h3>
              <span className="text-sm text-muted-foreground">
                ({section.items.length})
              </span>
            </div>

            {/* Section content */}
            {section.items.length > 0 ? (
              <div className="space-y-3">
                {section.type === "accommodation"
                  ? section.items.map((item) => (
                      <AccommodationCard
                        key={item.id}
                        accommodation={item as Accommodation}
                        timezone={timezone}
                        canEdit={canModifyAccommodation(item as Accommodation)}
                        canDelete={canModifyAccommodation(
                          item as Accommodation,
                        )}
                        onEdit={() =>
                          setEditingAccommodation(item as Accommodation)
                        }
                        onDelete={() =>
                          setEditingAccommodation(item as Accommodation)
                        }
                        createdByName={userNameMap.get((item as Accommodation).createdBy)}
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
                            memberName={userNameMap.get(travel.memberId) || "Unknown"}
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
                          createdByName={userNameMap.get((item as Event).createdBy)}
                          showDate
                        />
                      ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No {section.title.toLowerCase()} added yet
                </p>
              </div>
            )}
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
        />
      )}
    </div>
  );
}
