"use client";

import { useState } from "react";
import { Calendar, Clock, MapPin, ExternalLink } from "lucide-react";
import type { Accommodation } from "@tripful/shared/types";
import { Button } from "@/components/ui/button";
import { calculateNights, formatInTimezone } from "@/lib/utils/timezone";

interface AccommodationCardProps {
  accommodation: Accommodation;
  timezone: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  createdByName?: string | undefined;
  showDate?: boolean;
}

export function AccommodationCard({
  accommodation,
  timezone,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  createdByName,
  showDate,
}: AccommodationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const nights = calculateNights(accommodation.checkIn, accommodation.checkOut);
  const nightsLabel = nights === 1 ? "1 night" : `${nights} nights`;
  const datePrefix = showDate
    ? formatInTimezone(accommodation.checkIn + "T00:00:00", timezone, "date")
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className="rounded-xl border border-l-4 border-[var(--color-accommodation-border)] border-l-[var(--color-accommodation)] bg-[var(--color-accommodation-light)] p-4 transition-all hover:shadow-md cursor-pointer"
      onClick={() => setIsExpanded((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsExpanded((prev) => !prev);
        }
      }}
    >
      {/* Compact view */}
      <div>
        <h4 className="font-semibold text-foreground text-sm">
          {accommodation.name}
        </h4>
        {datePrefix && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{datePrefix}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <Clock className="w-3 h-3 shrink-0" />
          <span>{nightsLabel}</span>
        </div>
        {accommodation.address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(accommodation.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground active:text-primary hover:text-primary mt-0.5 py-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="underline underline-offset-2">
              {accommodation.address}
            </span>
          </a>
        )}
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div
          className="mt-4 pt-4 border-t border-[var(--color-accommodation-border)] space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Check-in</span>
              <p className="font-medium text-foreground">
                {accommodation.checkIn}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Check-out</span>
              <p className="font-medium text-foreground">
                {accommodation.checkOut}
              </p>
            </div>
          </div>

          {accommodation.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {accommodation.description}
            </p>
          )}

          {accommodation.links && accommodation.links.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-foreground">Links</h5>
              <div className="flex flex-wrap gap-2">
                {accommodation.links.map((link, index) => (
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
                  title="Edit accommodation"
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
                  title="Delete accommodation"
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
