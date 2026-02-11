"use client";

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
  const isArrival = memberTravel.travelType === "arrival";
  const bgColor = "bg-[var(--color-member-travel-light)]";
  const borderColor = "border-[var(--color-member-travel-border)]";
  const accentColor = "border-l-[var(--color-member-travel)]";

  const time = formatInTimezone(memberTravel.time, timezone, "time");
  const date = showDate ? formatInTimezone(memberTravel.time, timezone, "date") : null;

  return (
    <div
      className={`rounded-xl border border-l-4 ${borderColor} ${accentColor} ${bgColor} p-3 transition-all hover:shadow-sm`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground text-sm">
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
              <span className="underline underline-offset-2">{memberTravel.location}</span>
            </a>
          )}
          {memberTravel.details && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {memberTravel.details}
            </p>
          )}
        </div>

        {(canEdit || canDelete) && (
          <div className="flex items-center shrink-0">
            {canEdit && onEdit && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-10 w-10"
                title="Edit member travel"
              >
                <span className="sr-only">Edit</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
                  <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                </svg>
              </Button>
            )}
            {canDelete && onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-10 w-10 text-destructive hover:text-destructive"
                title="Delete member travel"
              >
                <span className="sr-only">Delete</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
