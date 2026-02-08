"use client";

import { useState } from "react";
import { Calendar, MapPin, Plane, Utensils, ExternalLink } from "lucide-react";
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
}

const EVENT_TYPE_CONFIG = {
  travel: {
    icon: Plane,
    color: "text-[var(--color-event-travel)]",
    bgColor: "bg-[var(--color-event-travel-light)]",
    borderColor: "border-[var(--color-event-travel-border)]",
    label: "Travel",
  },
  meal: {
    icon: Utensils,
    color: "text-[var(--color-event-meal)]",
    bgColor: "bg-[var(--color-event-meal-light)]",
    borderColor: "border-[var(--color-event-meal-border)]",
    label: "Meal",
  },
  activity: {
    icon: Calendar,
    color: "text-[var(--color-event-activity)]",
    bgColor: "bg-[var(--color-event-activity-light)]",
    borderColor: "border-[var(--color-event-activity-border)]",
    label: "Activity",
  },
} as const;

export function EventCard({
  event,
  timezone,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const config = EVENT_TYPE_CONFIG[event.eventType];
  const Icon = config.icon;

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

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-4 transition-all hover:shadow-md cursor-pointer`}
      onClick={() => setIsExpanded((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsExpanded((prev) => !prev);
        }
      }}
    >
      {/* Compact view */}
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bgColor} ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm">
                {event.name}
              </h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span>{timeDisplay}</span>
                {event.location && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
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

          <div className="text-xs text-muted-foreground">
            Created by user {event.createdBy}
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
