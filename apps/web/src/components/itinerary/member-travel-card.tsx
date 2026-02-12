"use client";

import { useState } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import type { MemberTravel } from "@tripful/shared/types";
import { Button } from "@/components/ui/button";
import { formatInTimezone } from "@/lib/utils/timezone";

interface MemberTravelCardProps {
  memberTravel: MemberTravel;
  memberName: string;
  timezone: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  showDate?: boolean;
}

export function MemberTravelCard({
  memberTravel,
  memberName,
  timezone,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  showDate,
}: MemberTravelCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isArrival = memberTravel.travelType === "arrival";
  const bgColor = "bg-[var(--color-member-travel-light)]";
  const borderColor = "border-[var(--color-member-travel-border)]";
  const accentColor = "border-l-[var(--color-member-travel)]";

  const time = formatInTimezone(memberTravel.time, timezone, "time");
  const date = showDate
    ? formatInTimezone(memberTravel.time, timezone, "date")
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className={`rounded-xl border border-l-4 ${borderColor} ${accentColor} ${bgColor} p-4 transition-all hover:shadow-md cursor-pointer`}
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
          {memberName} · {isArrival ? "Arrival" : "Departure"}
        </h4>
        {date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{date}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <Clock className="w-3 h-3 shrink-0" />
          <span>{time}</span>
        </div>
        {memberTravel.location && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(memberTravel.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground active:text-primary hover:text-primary mt-0.5 py-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="underline underline-offset-2">
              {memberTravel.location}
            </span>
          </a>
        )}
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div
          className="mt-4 pt-4 border-t border-[var(--color-member-travel-border)] space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {memberTravel.details && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {memberTravel.details}
            </p>
          )}

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
                  title="Edit member travel"
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
                  title="Delete member travel"
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
