"use client";

import { useMemo } from "react";
import { Home, Plane, Utensils, Calendar } from "lucide-react";
import type { Event, Accommodation } from "@tripful/shared/types";
import { EventCard } from "./event-card";
import { AccommodationCard } from "./accommodation-card";

interface GroupByTypeViewProps {
  events: Event[];
  accommodations: Accommodation[];
  timezone: string;
  isOrganizer: boolean;
  userId: string;
}

export function GroupByTypeView({
  events,
  accommodations,
  timezone,
  isOrganizer,
  userId,
}: GroupByTypeViewProps) {
  // Group events by type
  const groupedEvents = useMemo(() => {
    return {
      accommodations: accommodations.sort(
        (a, b) =>
          new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime(),
      ),
      travel: events
        .filter((e) => e.eventType === "travel")
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
      meal: events
        .filter((e) => e.eventType === "meal")
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
      activity: events
        .filter((e) => e.eventType === "activity")
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    };
  }, [events, accommodations]);

  // Check permissions
  const canEditEvent = (event: Event) => {
    return isOrganizer || event.createdBy === userId;
  };

  const canDeleteEvent = (event: Event) => {
    return isOrganizer || event.createdBy === userId;
  };

  const canEditAccommodation = (accommodation: Accommodation) => {
    return isOrganizer || accommodation.createdBy === userId;
  };

  const canDeleteAccommodation = (accommodation: Accommodation) => {
    return isOrganizer || accommodation.createdBy === userId;
  };

  const sections = [
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
  ];

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
                        canEdit={canEditAccommodation(item as Accommodation)}
                        canDelete={canDeleteAccommodation(
                          item as Accommodation,
                        )}
                        onEdit={() => {
                          // TODO: Implement edit dialog
                        }}
                        onDelete={() => {
                          // TODO: Implement delete confirmation
                        }}
                      />
                    ))
                  : section.items.map((item) => (
                      <EventCard
                        key={item.id}
                        event={item as Event}
                        timezone={timezone}
                        canEdit={canEditEvent(item as Event)}
                        canDelete={canDeleteEvent(item as Event)}
                        onEdit={() => {
                          // TODO: Implement edit dialog
                        }}
                        onDelete={() => {
                          // TODO: Implement delete confirmation
                        }}
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
    </div>
  );
}
