"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTripUnreadCount } from "@/hooks/use-notifications";
import { TripNotificationDialog } from "./trip-notification-dialog";

interface TripNotificationBellProps {
  tripId: string;
}

export function TripNotificationBell({ tripId }: TripNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: unreadCount } = useTripUnreadCount(tripId);

  const displayCount =
    unreadCount !== undefined && unreadCount > 0
      ? unreadCount > 9
        ? "9+"
        : String(unreadCount)
      : null;

  const ariaLabel =
    unreadCount !== undefined && unreadCount > 0
      ? `Trip notifications, ${unreadCount} unread`
      : "Trip notifications";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-lg"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
      >
        <Bell className="size-5" />
        {displayCount ? (
          <span
            key={displayCount}
            className="absolute -top-1 -right-1 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground h-[18px] motion-safe:animate-[badgePulse_600ms_ease-in-out]"
          >
            {displayCount}
          </span>
        ) : null}
      </Button>
      <TripNotificationDialog
        tripId={tripId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
