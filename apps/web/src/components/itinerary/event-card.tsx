"use client";

import { useState } from "react";
import { Calendar, Clock, MapPin, ExternalLink } from "lucide-react";
import type { Event } from "@tripful/shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatInTimezone } from "@/lib/utils/timezone";

interface EventCardProps {
  event: Event;
  timezone: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  createdByName?: string | undefined;
  showDate?: boolean;
}

const EVENT_TYPE_CONFIG = {
  travel: {
    bgColor: "bg-[var(--color-event-travel-light)]",
    borderColor: "border-[var(--color-event-travel-border)]",
    accentColor: "border-l-[var(--color-event-travel)]",
  },
  meal: {
    bgColor: "bg-[var(--color-event-meal-light)]",
    borderColor: "border-[var(--color-event-meal-border)]",
    accentColor: "border-l-[var(--color-event-meal)]",
  },
  activity: {
    bgColor: "bg-[var(--color-event-activity-light)]",
    borderColor: "border-[var(--color-event-activity-border)]",
    accentColor: "border-l-[var(--color-event-activity)]",
  },
} as const;

export function EventCard({
  event,
  timezone,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  createdByName,
  showDate,
}: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const config = EVENT_TYPE_CONFIG[event.eventType];

  // Format time
  const startTime = event.allDay
    ? "All day"
    : formatInTimezone(event.startTime, timezone, "time");
  const endTime = event.endTime
    ? formatInTimezone(event.endTime, timezone, "time")
    : null;
  const timeDisplay = event.allDay
    ? "All day"
    : endTime
      ? `${startTime} - ${endTime}`
      : startTime;
  const datePrefix = showDate
    ? formatInTimezone(event.startTime, timezone, "date")
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className={`rounded-xl border border-l-4 ${config.borderColor} ${config.accentColor} ${config.bgColor} p-4 transition-all hover:shadow-md cursor-pointer`}
      onClick={() => setIsExpanded((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsExpanded((prev) => !prev);
        }
      }}
    >
      {/* Compact view */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm">
                {event.name}
              </h4>
              {datePrefix && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{datePrefix}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Clock className="w-3 h-3 shrink-0" />
                <span>{timeDisplay}</span>
              </div>
              {event.location && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground active:text-primary hover:text-primary mt-0.5 py-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="underline underline-offset-2">{event.location}</span>
                </a>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {event.creatorAttending === false && (
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/30"
                >
                  Member no longer attending
                </Badge>
              )}
              {event.isOptional && (
                <Badge
                  variant="outline"
                  className="text-xs bg-background/50 border-border"
                >
                  Optional
                </Badge>
              )}
        </div>
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div
          className="mt-4 pt-4 border-t border-border space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {event.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {event.description}
            </p>
          )}

          {event.links && event.links.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-foreground">Links</h5>
              <div className="flex flex-wrap gap-2">
                {event.links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Link {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className={`text-xs text-muted-foreground ${event.creatorAttending === false ? "opacity-50 line-through" : ""}`}>
            Created by {createdByName || "Unknown"}
          </div>

          {(canEdit || canDelete) && (
            <div className="flex items-center gap-2 pt-2">
              {canEdit && onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="h-8 text-xs"
                  title="Edit event"
                >
                  Edit
                </Button>
              )}
              {canDelete && onDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="h-8 text-xs"
                  title="Delete event"
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
