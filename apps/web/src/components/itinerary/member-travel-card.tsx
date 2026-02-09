"use client";

import { Plane, MapPin } from "lucide-react";
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
  const Icon = Plane;
  const color = isArrival
    ? "text-[var(--color-arrival)]"
    : "text-[var(--color-departure)]";
  const bgColor = isArrival
    ? "bg-[var(--color-arrival-light)]"
    : "bg-[var(--color-departure-light)]";
  const borderColor = isArrival
    ? "border-[var(--color-arrival-border)]"
    : "border-[var(--color-departure-border)]";
  const rotateClass = isArrival ? "" : "rotate-45";

  const time = formatInTimezone(memberTravel.time, timezone, showDate ? "datetime" : "time");

  return (
    <div
      className={`rounded-xl border ${borderColor} ${bgColor} p-3 transition-all hover:shadow-sm`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgColor} ${color}`}>
          <Icon className={`w-4 h-4 ${rotateClass}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">{memberName}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{time}</span>
            {memberTravel.location && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">
                    {memberTravel.location}
                  </span>
                </div>
              </>
            )}
          </div>
          {memberTravel.details && (
            <p className="text-xs text-muted-foreground mt-1">
              {memberTravel.details}
            </p>
          )}
        </div>

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && onEdit && (
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-6 w-6"
                title="Edit member travel"
              >
                <span className="sr-only">Edit</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="w-3 h-3"
                >
                  <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
                  <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                </svg>
              </Button>
            )}
            {canDelete && onDelete && (
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-6 w-6 text-destructive hover:text-destructive"
                title="Delete member travel"
              >
                <span className="sr-only">Delete</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="w-3 h-3"
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
