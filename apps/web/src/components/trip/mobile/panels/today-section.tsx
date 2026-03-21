"use client";

import { useMemo, useState } from "react";
import type { Event, DailyForecast, TemperatureUnit } from "@journiful/shared/types";
import { useEvents } from "@/hooks/use-events";
import { getDayInTimezone, utcToLocalParts } from "@/lib/utils/timezone";
import { getWeatherInfo, toDisplayTemp } from "@/lib/weather-codes";
import { EventCard } from "@/components/itinerary/event-card";
import { EventDetailSheet } from "@/components/itinerary/event-detail-sheet";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_VISIBLE_EVENTS = 4;

interface TodaySectionProps {
  tripId: string;
  timezone: string;
  onNavigateToItinerary: () => void;
  weather?: DailyForecast;
  temperatureUnit?: TemperatureUnit;
}

export function TodaySection({
  tripId,
  timezone,
  onNavigateToItinerary,
  weather,
  temperatureUnit = "fahrenheit",
}: TodaySectionProps) {
  const { data: events, isPending: eventsLoading } = useEvents(tripId);

  const todayString = useMemo(
    () => getDayInTimezone(new Date(), timezone),
    [timezone],
  );

  // Filter events to today
  const todayEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((event) => {
      const startDay = getDayInTimezone(event.startTime, timezone);

      if (event.allDay) {
        // All-day events: check if today is in range
        if (!event.endTime) return startDay === todayString;
        const endDay = getDayInTimezone(event.endTime, timezone);
        return startDay <= todayString && todayString <= endDay;
      }

      // Timed events: check if today falls within start-end range
      const endIsMidnight = event.endTime
        ? utcToLocalParts(
            typeof event.endTime === "string"
              ? event.endTime
              : event.endTime.toISOString(),
            timezone,
          ).time === "00:00"
        : false;
      const endDay =
        event.endTime && !endIsMidnight
          ? getDayInTimezone(event.endTime, timezone)
          : startDay;

      if (startDay === endDay) {
        return startDay === todayString;
      }
      // Multi-day event
      return startDay <= todayString && todayString <= endDay;
    });
  }, [events, timezone, todayString]);

  // Sort: all-day first, then by startTime
  const sortedEvents = useMemo(() => {
    return [...todayEvents].sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    });
  }, [todayEvents]);

  const visibleEvents = sortedEvents.slice(0, MAX_VISIBLE_EVENTS);
  const hasMoreEvents = sortedEvents.length > MAX_VISIBLE_EVENTS;

  // Detail sheet state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const isLoading = eventsLoading;
  const isEmpty = !isLoading && sortedEvents.length === 0;

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date()),
    [timezone],
  );

  // Weather badge text
  const weatherBadge = useMemo(() => {
    if (!weather) return null;
    const info = getWeatherInfo(weather.weatherCode);
    const Icon = info.icon;
    const temp = toDisplayTemp(weather.temperatureMax, temperatureUnit);
    const unit = temperatureUnit === "fahrenheit" ? "F" : "C";
    return { Icon, temp, unit };
  }, [weather, temperatureUnit]);

  // Return null if no events today (parent handles conditional rendering)
  if (!isLoading && isEmpty) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
        <span>Today</span>
        <span className="font-normal text-muted-foreground">
          {todayLabel}
        </span>
        {weatherBadge && (
          <span className="inline-flex items-center gap-1 font-normal text-muted-foreground">
            <span>·</span>
            <weatherBadge.Icon className="size-3.5" />
            <span>{weatherBadge.temp}°{weatherBadge.unit}</span>
          </span>
        )}
      </h3>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      )}

      {!isLoading && !isEmpty && (
        <div className="space-y-2">
          {visibleEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              timezone={timezone}
              onClick={setSelectedEvent}
            />
          ))}

          {hasMoreEvents && (
            <button
              onClick={onNavigateToItinerary}
              className="w-full text-center text-sm text-primary hover:text-primary/80 py-2 transition-colors cursor-pointer"
            >
              View all in itinerary
            </button>
          )}
        </div>
      )}

      {/* Detail sheet */}
      <EventDetailSheet
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        timezone={timezone}
        canEdit={false}
        canDelete={false}
        onEdit={() => {}}
      />
    </div>
  );
}
