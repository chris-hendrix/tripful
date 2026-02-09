"use client";

import { useState } from "react";
import { Home, MapPin, ExternalLink } from "lucide-react";
import type { Accommodation } from "@tripful/shared/types";
import { Badge } from "@/components/ui/badge";
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
      className="rounded-xl border border-[var(--color-accommodation-border)] bg-[var(--color-accommodation-light)] p-4 transition-all hover:shadow-md cursor-pointer"
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
        <div className="p-2 rounded-lg bg-[var(--color-accommodation-light)] text-[var(--color-accommodation)]">
          <Home className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm">
                {accommodation.name}
              </h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span>{datePrefix ? `${datePrefix} • ${nightsLabel}` : nightsLabel}</span>
                {accommodation.address && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{accommodation.address}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Badge
              variant="outline"
              className="text-xs bg-[var(--color-accommodation-light)] text-[var(--color-accommodation)] border-[var(--color-accommodation-border)] shrink-0"
            >
              Accommodation
            </Badge>
          </div>
        </div>
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
