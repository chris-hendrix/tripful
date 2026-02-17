"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUnreadCount } from "@/hooks/use-notifications";
import { ErrorBoundary } from "@/components/error-boundary";
import { NotificationDropdown } from "./notification-dropdown";

const ANIMATION_CLASS = "motion-safe:animate-[badgePulse_600ms_ease-in-out]";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount } = useUnreadCount();
  const badgeRef = useRef<HTMLSpanElement>(null);

  const displayCount =
    unreadCount !== undefined && unreadCount > 0
      ? unreadCount > 9
        ? "9+"
        : String(unreadCount)
      : null;

  useEffect(() => {
    const el = badgeRef.current;
    if (!el) return;
    el.classList.remove(ANIMATION_CLASS);
    void el.offsetWidth;
    el.classList.add(ANIMATION_CLASS);
  }, [displayCount]);

  const ariaLabel =
    unreadCount !== undefined && unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-lg"
          aria-label={ariaLabel}
        >
          <Bell className="size-5" />
          {displayCount && (
            <span
              ref={badgeRef}
              className="absolute -top-1 -right-1 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground h-[18px] motion-safe:animate-[badgePulse_600ms_ease-in-out]"
            >
              {displayCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[380px] p-0" align="end">
        <Suspense fallback={null}>
          <ErrorBoundary>
            <NotificationDropdown onClose={() => setOpen(false)} />
          </ErrorBoundary>
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}
