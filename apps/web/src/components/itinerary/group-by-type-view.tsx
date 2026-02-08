"use client";

import { useMemo, useState } from "react";
import { Home, Plane, Utensils, Calendar } from "lucide-react";
import type { Event, Accommodation } from "@tripful/shared/types";
import { EventCard } from "./event-card";
import { AccommodationCard } from "./accommodation-card";
import { EditEventDialog } from "./edit-event-dialog";
import { EditAccommodationDialog } from "./edit-accommodation-dialog";

interface GroupByTypeViewProps {
  events: Event[];
  accommodations: Accommodation[];
  timezone: string;
  isOrganizer: boolean;
  userId: string;
  userNameMap: Map<string, string>;
}

export function GroupByTypeView({
  events,
  accommodations,
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

    return {
      accommodations: [...accommodations].sort(
        (a, b) =>
          new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime(),
      ),
      travel: travel.sort(sortByStartTime),
      meal: meal.sort(sortByStartTime),
      activity: activity.sort(sortByStartTime),
    };
  }, [events, accommodations]);

  // Check permissions
  const canModifyEvent = (event: Event) => {
    return isOrganizer || event.createdBy === userId;
  };

  const canModifyAccommodation = (accommodation: Accommodation) => {
    return isOrganizer || accommodation.createdBy === userId;
  };

  // Edit dialog state
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingAccommodation, setEditingAccommodation] =
    useState<Accommodation | null>(null);

  const sections = useMemo(() => [
    {
      title: "Accommodations",
      icon: Home,
      color: "text-[var(--color-accommodation)]",
      items: groupedEvents.accommodations,
      type: "accommodation" as const,
    },
    {
      title: "Travel",
      icon: Plane,
      color: "text-[var(--color-event-travel)]",
      items: groupedEvents.travel,
      type: "event" as const,
    },
    {
      title: "Meals",
      icon: Utensils,
      color: "text-[var(--color-event-meal)]",
      items: groupedEvents.meal,
      type: "event" as const,
    },
    {
      title: "Activities",
      icon: Calendar,
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
                <Icon className="w-5 h-5" />
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
                      />
                    ))
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
    </div>
  );
}
