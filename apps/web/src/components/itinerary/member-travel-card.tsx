"use client";

import { Clock, MapPin, PlaneLanding, PlaneTakeoff } from "lucide-react";
import type { MemberTravel } from "@tripful/shared/types";
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
  onEdit,
  showDate,
}: MemberTravelCardProps) {
  const isArrival = memberTravel.travelType === "arrival";
  const PlaneIcon = isArrival ? PlaneLanding : PlaneTakeoff;

  const time = formatInTimezone(memberTravel.time, timezone, "time");
  const date = showDate
    ? formatInTimezone(memberTravel.time, timezone, "date")
    : null;

  const isClickable = canEdit && onEdit;

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`rounded-lg py-1.5 px-2 transition-all ${isClickable ? "hover:bg-muted/50 cursor-pointer" : ""}`}
      onClick={isClickable ? onEdit : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit?.();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <PlaneIcon className="w-4 h-4 shrink-0" />
        <span className="font-medium text-foreground">{memberName}</span>
        <span className="text-muted-foreground/40">·</span>
        {date && (
          <>
            <span>{date}</span>
            <span className="text-muted-foreground/40">·</span>
          </>
        )}
        <Clock className="w-3 h-3 shrink-0" />
        <span>{time}</span>
        {memberTravel.location && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(memberTravel.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-primary active:text-primary min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="underline underline-offset-2 truncate">
                {memberTravel.location}
              </span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
